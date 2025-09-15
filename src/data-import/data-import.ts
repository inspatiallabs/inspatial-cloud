import { defineEntry } from "../orm/entry/entry-type.ts";
import type { EntryMap, EntryName } from "#types/models.ts";
import { csvUtils } from "./csv-utils.ts";
import type { GenericEntry } from "../orm/entry/entry-base.ts";
import type { Entry } from "../orm/entry/entry.ts";
import { handlePgError, isPgError } from "../orm/db/postgres/pgError.ts";

export const dataImport = defineEntry("dataImport", {
  label: "",
  description: "",
  fields: [{
    key: "csv",
    label: "",
    type: "FileField",
    allowedFileTypes: {
      document: ["csv"],
    },
  }, {
    key: "entryType",
    label: "Entry",
    type: "ConnectionField",
    required: true,
    entryType: "entryMeta",
  }, {
    key: "status",
    label: "Status",
    type: "ChoicesField",
    choices: [
      { key: "pending", label: "Pending" },
      { key: "processing", label: "Processing" },
      { key: "completed", label: "Completed" },
      { key: "failed", label: "Failed" },
    ],
    defaultValue: "pending",
    readOnly: true,
  }, {
    key: "importType",
    type: "ChoicesField",
    choices: [{
      key: "create",
      label: "Create",
      description: "Create new records only",
    }, {
      key: "update",
      label: "Update",
      description: "Update existing records only",
    }, {
      key: "upsert",
      label: "Create or Update",
      description: "Create new records or update existing records",
    }],
  }, {
    key: "matchFrom",
    type: "ConnectionField",
    entryType: "fieldMeta",
    filterBy: {
      entryMeta: "entryType",
    },
    label: "Match Column",
    description:
      "Column to match existing records on when updating or upserting. Only used if import type is 'update' or 'upsert'.",
  }, {
    key: "totalRecords",
    label: "Total Records",
    type: "IntField",
    defaultValue: 0,
    readOnly: true,
  }, {
    key: "successfulRecords",
    label: "Successful Records",
    type: "IntField",
    defaultValue: 0,
    readOnly: true,
  }, {
    key: "failedRecords",
    label: "Failed Records",
    type: "IntField",
    defaultValue: 0,
    readOnly: true,
  }, {
    key: "errorMessage",
    label: "Error Message",
    type: "TextField",
    readOnly: true,
  }],
});

dataImport.addHook("validate", {
  name: "validateEntryType",
  handler({ dataImport, orm }) {
    const entryType = dataImport.$entryType;
    const result = orm.getEntryType(entryType as EntryName);
  },
});
dataImport.addChild("columnMap", {
  fields: [{
    key: "columnName",
    label: "Column Name",
    type: "DataField",
    required: true,
    readOnly: true,
  }, {
    key: "exampleData",
    label: "Example Data",
    type: "DataField",
    readOnly: true,
  }, {
    key: "mapTo",
    label: "Map To",
    type: "ConnectionField",
    entryType: "fieldMeta",
    filterBy: {
      entryMeta: "entryType",
    },
  }],
});
dataImport.addAction("getContent", {
  async action({ dataImport, orm }) {
    if (!dataImport.$csv) {
      return { success: false, message: "No CSV file provided" };
    }
    const file = await orm.getEntry("cloudFile", dataImport.$csv);
    const content = await file.runAction("getContent", {
      asText: true,
    }) as string;
    const { headers, records } = csvUtils.parseCSV(content);
    return { success: true, headers, records };
  },
});
dataImport.addAction("processInfo", {
  async action({ dataImport, orm }) {
    const result = await dataImport.runAction("getContent") as {
      success: boolean;
      message?: string;
      headers?: Array<string>;
      records?: Array<Record<string, unknown>>;
    };
    if (!result.success) {
      dataImport.$status = "failed";
      await dataImport.save();
      return result;
    }
    const { headers, records } = result;
    if (!headers || !records) {
      dataImport.$status = "failed";
      await dataImport.save();
      return { success: false, message: "No data found in CSV" };
    }
    const entryType = orm.getEntryType(dataImport.$entryType as EntryName);
    const fieldKeys = new Map(
      entryType.fields.keys().map((
        key,
      ) => [key, `${dataImport.$entryType}:${key}`]),
    );
    const firstRecord = new Map<string, any>(Object.entries(records[0] || {}));
    const columnMapData = headers.map((header) => ({
      columnName: header,
      exampleData: (firstRecord.get(header) || "").toString().slice(0, 255),
      mapTo: fieldKeys.get(header) || null,
    })).sort((a, b) => a.mapTo ? b.mapTo ? 0 : -1 : 1);

    dataImport.$columnMap.update(columnMapData);
    dataImport.$totalRecords = records.length;
    await dataImport.save();
  },
});
dataImport.addAction("import", {
  async action({ dataImport, orm }) {
    const dataMap = dataImport.$columnMap.data.filter((col) => col.mapTo).map(
      (col) => ({
        columnName: col.columnName,
        mapTo: col.mapTo!.split(":")[1],
      }),
    );
    const result = await dataImport.runAction("getContent") as {
      success: boolean;
      message?: string;
      headers?: Array<string>;
      records?: Array<Record<string, unknown>>;
    };
    if (!result.success) {
      dataImport.$status = "failed";
      await dataImport.save();
      return result;
    }
    const { records } = result;
    if (!records) {
      dataImport.$status = "failed";
      await dataImport.save();
      return { success: false, message: "No data found in CSV" };
    }
    dataImport.$status = "processing";
    await dataImport.save();
    let successfulRecords = 0;
    let failedRecords = 0;
    const entriesToCreate = [];
    for (const record of records) {
      const recordMap = new Map<string, any>(Object.entries(record));
      const entryData = new Map<string, any>();
      for (const map of dataMap) {
        const val = recordMap.get(map.columnName);
        entryData.set(map.mapTo, val === "" ? null : val);
      }
      entriesToCreate.push(Object.fromEntries(entryData));
    }
    const entryType = dataImport.$entryType as EntryName;
    const matchFieldKey = dataImport.$matchFrom?.split(":")[1] || null;
    const errors: Array<string> = [];
    for (const entryData of entriesToCreate) {
      let entry: EntryMap[EntryName] | null = null;
      switch (dataImport.$importType) {
        case "update":
        case "upsert": {
          if (!matchFieldKey) {
            break;
          }
          const value = entryData[matchFieldKey];
          if (!value) {
            break;
          }
          entry = await orm.findEntry(entryType, [{
            field: matchFieldKey,
            op: "=",
            value,
          }]);
          break;
        }
        case "create":
          break;
      }
      if (!entry) {
        entry = orm.getNewEntry(entryType);
      }
      for (const [key, value] of Object.entries(entryData)) {
        (entry as any)[`$${key}`] = value;
      }
      try {
        await entry.save();
        successfulRecords++;
      } catch (e) {
        if (isPgError(e)) {
          const { info, response, subject } = handlePgError(e);
          errors.push(
            `${subject} - ${JSON.stringify(info)} - ${response.join(", ")}`,
          );
        } else {
          let message = "Unknown error";
          if (e instanceof Error) {
            message = e.message;
          } else if (typeof e === "string") {
            message = e;
          }
          errors.push(message);
        }

        failedRecords++;
      }
    }
    dataImport.$errorMessage = errors.join("\n");
    dataImport.$successfulRecords = successfulRecords;
    dataImport.$failedRecords = failedRecords;
    dataImport.$status = "completed";
    await dataImport.save();
  },
});
