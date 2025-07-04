import { CloudAPIAction } from "~/api/cloud-action.ts";
import { CloudAPIGroup } from "~/api/cloud-group.ts";
import type { EntryTypeInfo } from "~/orm/entry/types.ts";

const getEntryAction = new CloudAPIAction("getEntry", {
  label: "Get Entry",
  description: "Get a singe entry for a given Entry Type",
  async run({ orm, params }) {
    const { entryType, id } = params;
    const entry = await orm.getEntry(entryType, id);
    return entry.data;
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

const newEntryAction = new CloudAPIAction("getNewEntry", {
  label: "Get New Entry",
  description:
    "Get the default values for a new entry, not saved to the database",
  run({ orm, params }) {
    const { entryType } = params;
    const entry = orm.getNewEntry(entryType);
    return entry.data;
  },
  params: [{
    key: "entryType",
    type: "DataField",
    label: "Entry Type",
    description: "The Entry Type to get",
    required: true,
  }],
});

const updateEntryAction = new CloudAPIAction("updateEntry", {
  label: "Update Entry",
  description: "Update an existing entry",

  async run({ orm, params }) {
    const { entryType, id, data } = params;
    const entry = await orm.getEntry(entryType, id);
    entry.update(data);
    await entry.save();
    return entry.data;
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

const createEntryAction = new CloudAPIAction("createEntry", {
  label: "Create Entry",
  description: "Create a new entry",
  async run({ orm, params }) {
    const { entryType, data } = params;
    const entry = await orm.createEntry(entryType, data);
    return entry.data;
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

const runEntryAction = new CloudAPIAction("runEntryAction", {
  label: "Run Entry Action",
  description: "Run an action on an entry",
  async run({ orm, params }) {
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

const deleteEntryAction = new CloudAPIAction("deleteEntry", {
  label: "Delete Entry",
  description: "Delete an existing entry",
  async run({ orm, params }) {
    const { entryType, id } = params;
    await orm.deleteEntry(entryType, id);
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

const getEntryListAction = new CloudAPIAction("getEntryList", {
  label: "Get Entry List",
  description: "Get a list of entries for a given Entry Type",
  async run({ orm, params }) {
    const { entryType, options } = params;
    const entryList = await orm.getEntryList(entryType, options);
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

const getEntryTypeInfoAction = new CloudAPIAction("getEntryTypeInfo", {
  label: "Get Entry Type Info",
  description: "Get the Entry Type definition for a given Entry Type",
  run({ orm, params }): EntryTypeInfo {
    const entryType = orm.getEntryType(params.entryType);
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
const entriesGroup = new CloudAPIGroup("entry", {
  description: "CRUD actions for InSpatial ORM Entries",
  actions: [
    getEntryTypeInfoAction,
    getEntryAction,
    runEntryAction,
    updateEntryAction,
    newEntryAction,
    createEntryAction,
    deleteEntryAction,
    getEntryListAction,
  ],
});

export default entriesGroup;
