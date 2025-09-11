import { defineEntry } from "../orm/entry/entry-type.ts";
import type { EntryName } from "#types/models.ts";
import { csvUtils } from "./csv-utils.ts";

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
    type: "DataField",
    required: true,
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
  }],
});

dataImport.addHook("validate", {
  name: "validateEntryType",
  handler({ dataImport, orm }) {
    const entryType = dataImport.$entryType;
    const result = orm.getEntryType(entryType as EntryName);
    console.log({ result });
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
    type: "DataField",
  }],
});
dataImport.addAction("getContent", {
  async action({ dataImport, orm }) {
    if (!dataImport.$csv) {
      return { success: false, message: "No CSV file provided" };
    }
    const file = await orm.getEntry("globalCloudFile", dataImport.$csv);
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
    const firstRecord = new Map<string, any>(Object.entries(records[0] || {}));
    dataImport.$columnMap.update(headers.map((header) => ({
      columnName: header,
      exampleData: (firstRecord.get(header) || "").toString().slice(0, 255),
      mapTo: null,
    })));
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
      console.log(recordMap);
      const entryData = new Map<string, any>();
      for (const map of dataMap) {
        console.log(map);
        entryData.set(map.mapTo, recordMap.get(map.columnName));
      }
      entriesToCreate.push(Object.fromEntries(entryData));
    }
    for (const entryData of entriesToCreate) {
      try {
        const entry = orm.getNewEntry(dataImport.$entryMeta as EntryName);
        for (const [key, value] of Object.entries(entryData)) {
          (entry as any)[`$${key}`] = value;
        }
        await entry.save();
        successfulRecords++;
      } catch (e) {
        console.error("Error creating entry", e);
        failedRecords++;
      }
    }
    dataImport.$successfulRecords = successfulRecords;
    dataImport.$failedRecords = failedRecords;
    dataImport.$status = "completed";
    await dataImport.save();
  },
});
