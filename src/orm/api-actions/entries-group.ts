import { CloudAPIAction, defineAPIAction } from "~/api/cloud-action.ts";
import type { EntryTypeInfo } from "~/orm/entry/types.ts";
import type { DBFilter } from "../db/db-types.ts";
import type { EntryName } from "#types/models.ts";
import { csvUtils } from "../../data-import/csv-utils.ts";

export const getEntryAction = defineAPIAction("getEntry", {
  label: "Get Entry",
  description: "Get a singe entry for a given Entry Type",
  async action({ orm, params }) {
    const { entryType, id } = params;
    const entry = await orm.getEntry(entryType as EntryName, id);
    return entry.clientData;
  },
  params: [{
    key: "entryType",
    type: "DataField",
    label: "Entry Type",
    description: "The Entry Type to get",
    required: true,
  }, {
    key: "id",
    type: "DataField",
    label: "ID",
    description: "The ID of the Entry to get",
    required: true,
  }],
});

export const newEntryAction = defineAPIAction("getNewEntry", {
  label: "Get New Entry",
  description:
    "Get the default values for a new entry, not saved to the database",
  action({ orm, params }) {
    const { entryType } = params;
    const entry = orm.getNewEntry(entryType as EntryName);
    return entry.clientData;
  },
  params: [{
    key: "entryType",
    type: "DataField",
    label: "Entry Type",
    description: "The Entry Type to get",
    required: true,
  }],
});

export const updateEntryAction = defineAPIAction("updateEntry", {
  label: "Update Entry",
  description: "Update an existing entry",

  async action({ orm, params }) {
    const { entryType, id, data } = params;
    const entry = await orm.getEntry(entryType as EntryName, id);
    entry.update(data);
    await entry.save();
    return entry.clientData;
  },
  params: [{
    key: "entryType",
    type: "DataField",
    label: "Entry Type",
    description: "The Entry Type to update",
    required: true,
  }, {
    key: "id",
    type: "DataField",
    label: "ID",
    description: "The ID of the Entry to update",
    required: true,
  }, {
    key: "data",
    type: "JSONField",
    label: "Data",
    description: "The data to update the entry with",
    required: true,
  }],
});

export const createEntryAction = defineAPIAction("createEntry", {
  label: "Create Entry",
  description: "Create a new entry",
  async action({ orm, params }) {
    const { entryType, data } = params;
    const entry = await orm.createEntry(entryType as EntryName, data as any);
    return entry.clientData;
  },
  params: [{
    key: "entryType",
    type: "DataField",
    label: "Entry Type",
    description: "The Entry Type to create",
    required: true,
  }, {
    key: "data",
    type: "JSONField",
    label: "Data",
    description: "The data to create the entry with",
    required: true,
  }],
});

export const runEntryAction = defineAPIAction("runEntryAction", {
  label: "Run Entry Action",
  description: "Run an action on an entry",
  async action({ orm, params }) {
    const { entryType, id, action, data, enqueue } = params;

    const entry = await orm.getEntry(entryType, id);
    if (enqueue) {
      await entry.enqueueAction(action, data);
      return {
        message: `Action ${action} enqueued for ${entryType}: ${id}`,
      };
    }
    return await entry.runAction(action, data);
  },
  params: [{
    key: "entryType",
    type: "DataField",
    label: "Entry Type",
    description: "The Entry Type to run the action on",
    required: true,
  }, {
    key: "id",
    type: "DataField",
    label: "ID",
    description: "The ID of the Entry to run the action on",
    required: true,
  }, {
    key: "action",
    type: "DataField",
    label: "Action",
    description: "The action to run",
    required: true,
  }, {
    key: "data",
    type: "JSONField",
    label: "Data",
    description: "The data to run the action with",
    required: false,
  }, {
    key: "enqueue",
    type: "BooleanField",
    label: "Enqueue",
    description:
      "Whether to send the action to the queue instead of running it immediately",
    required: false,
  }],
});

export const deleteEntryAction = defineAPIAction("deleteEntry", {
  label: "Delete Entry",
  description: "Delete an existing entry",
  async action({ orm, params }) {
    const { entryType, id } = params;
    await orm.deleteEntry(entryType as EntryName, id);
    return {
      entryType,
      id,
      deleted: true,
    };
  },
  params: [{
    key: "entryType",
    type: "DataField",
    label: "Entry Type",
    description: "The Entry Type to delete",
    required: true,
  }, {
    key: "id",
    type: "DataField",
    label: "ID",
    description: "The ID of the Entry to delete",
    required: true,
  }],
});

export const getEntryListAction = defineAPIAction("getEntryList", {
  label: "Get Entry List",
  description: "Get a list of entries for a given Entry Type",
  async action({ orm, params }) {
    const { entryType, options } = params;
    const entryTypeDef = orm.getEntryType(entryType as EntryName);
    // entryTypeDef.hiddenClientFields
    const defaultListFields = Array.from(entryTypeDef.defaultListFields);
    const fields = new Set(
      options?.columns as string[] | undefined || defaultListFields,
    );
    if (fields.has("*")) {
      fields.clear();
      for (const f of entryTypeDef.displayFields.keys()) {
        fields.add(f);
      }
    }
    for (const field of fields) {
      if (entryTypeDef.hiddenClientFields.has(field)) {
        fields.delete(field);
      }
    }
    const newOptions = {
      ...options,
      columns: Array.from(fields),
    };
    const entryList = await orm.getEntryList(
      entryType as EntryName,
      newOptions as any,
    );
    return entryList;
  },
  params: [{
    key: "entryType",
    type: "DataField",
    label: "Entry Type",
    description: "The Entry Type to list",
    required: true,
  }, {
    key: "options",
    type: "JSONField",
    label: "Options",
    description: "Options for the list",
    required: false,
  }],
});

export const countConnections = defineAPIAction("countConnections", {
  label: "Count Entry Connections",
  description:
    "Count the total entries referencing the provided entry id, grouped by entry type",
  params: [{
    key: "entryType",
    type: "DataField",
    label: "Entry Type",
    description: "The Entry Type to count connections for",
    required: true,
  }, {
    key: "id",
    type: "DataField",
    label: "ID",
    description: "The ID of the Entry to count connections for",
    required: true,
  }],
  async action({ orm, params: { entryType, id } }) {
    return await orm.countConnections(entryType as EntryName, id);
  },
});

export const getEntryTypeInfoAction = defineAPIAction("getEntryTypeInfo", {
  label: "Get Entry Type Info",
  description: "Get the Entry Type definition for a given Entry Type",
  action({ orm, params }): EntryTypeInfo {
    const entryType = orm.getEntryType(params.entryType as EntryName);
    return entryType.info as EntryTypeInfo;
  },
  params: [{
    key: "entryType",
    type: "DataField",
    label: "Entry Type",
    description: "The Entry Type to get the schema for",
    required: true,
  }],
});
export const sum = defineAPIAction("sum", {
  label: "Sum",
  description: "Get the sum of the selected fields for a given Entry Type",
  params: [
    {
      key: "entryType",
      type: "DataField",
      label: "Entry Type",
      description: "The Entry Type to list",
      required: true,
    },
    { key: "filter", type: "JSONField", required: false },
    { key: "orFilter", type: "JSONField", required: false },
    { key: "fields", type: "ListField", required: true },
    {
      key: "groupBy",
      type: "ListField",
      required: false,
      description: "The field to group the results by, if any",
    },
  ],
  async action(
    { orm, params: { entryType, fields, filter, orFilter, groupBy } },
  ) {
    if (groupBy === undefined) {
      return await orm.sum(entryType, {
        fields,
        filter: filter as DBFilter,
        orFilter: orFilter as DBFilter,
      });
    }

    return await orm.sum(entryType, {
      fields,
      filter: filter as DBFilter,
      orFilter: orFilter as DBFilter,
      groupBy: groupBy,
    });
  },
});

export const count = new CloudAPIAction("count", {
  label: "Count",
  description:
    "Get the count of entries for a given Entry Type, optionally grouped by a field",
  async action({
    orm,
    params: { entryType, filter, orFilter, groupBy },
  }) {
    const result = await orm.count(entryType as EntryName, {
      filter: filter as DBFilter,
      orFilter: orFilter as DBFilter,
      groupBy: groupBy as any,
    });
    if (typeof result === "number") {
      return { count: result };
    }
    return result;
  },
  params: [
    { key: "entryType", type: "DataField", required: true },
    { key: "filter", type: "JSONField", required: false },
    { key: "orFilter", type: "JSONField", required: false },
    { key: "groupBy", type: "ListField", required: false },
  ],
});

export const exportEntry = defineAPIAction("export", {
  label: "Export Entry List",
  description:
    "Export a list of entries for a given Entry Type as CSV,PDF or JSON",
  async action({ orm, params, inResponse }) {
    const { entryType, columns, order, filter, orFilter, orderBy, format } =
      params;
    const response = await orm.getEntryList(entryType as EntryName, {
      columns: columns as any[] | undefined,
      filter: filter as DBFilter | undefined,
      orFilter: orFilter as DBFilter | undefined,
      order: order as "asc" | "desc" | undefined,
      orderBy: orderBy as string | undefined,
      limit: 0,
    });

    const { columns: exportedColumns, rowCount, rows } = response;
    switch (format) {
      case "csv":
        {
          const csvContent = csvUtils.createCSV(rows);
          inResponse.setFile({
            content: csvContent,
            fileName: `${entryType}-export-${new Date().toISOString()}.csv`,
            download: true,
          });
          return inResponse;
        }
        break;
      case "json":
        break;
      case "pdf":
        break;
    }

    return {
      exportedColumns,
      rowCount,
    };
  },
  params: [{
    key: "entryType",
    type: "ConnectionField",
    entryType: "entryMeta",
    label: "Entry Type",
    description: "The Entry Type to export",
    required: true,
  }, {
    key: "columns",
    type: "ListField",
    label: "Columns",
    description:
      "The columns to include in the export, if not provided all default list fields will be used",
    required: false,
  }, {
    key: "filter",
    type: "JSONField",
    label: "Filter",
    description: "Filter to apply to the exported list",
    required: false,
  }, {
    key: "orFilter",
    type: "JSONField",
    label: "Or Filter",
    description: "Or Filter to apply to the exported list",
    required: false,
  }, {
    key: "orderBy",
    type: "ConnectionField",
    entryType: "fieldMeta",
    label: "Order By",
    filterBy: {
      entryMeta: "entryType",
    },
  }, {
    key: "order",
    type: "ChoicesField",
    label: "Order",
    description: "Order direction",
    required: false,
    defaultValue: "asc",
    choices: [{
      key: "asc",
      label: "Ascending",
      description: "Sort in ascending order",
    }, {
      key: "desc",
      label: "Descending",
      description: "Sort in descending order",
    }],
  }, {
    key: "format",
    type: "ChoicesField",
    required: true,
    choices: [
      { key: "csv", label: "CSV", description: "Export as CSV" },
      { key: "pdf", label: "PDF", description: "Export as PDF" },
      { key: "json", label: "JSON", description: "Export as JSON" },
    ],
  }],
});
