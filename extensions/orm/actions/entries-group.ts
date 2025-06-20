import { CloudAPIAction } from "/api/cloud-action.ts";
import { CloudAPIGroup } from "/api/cloud-group.ts";
import type { EntryTypeInfo } from "/orm/entry/types.ts";

const getEntryAction = new CloudAPIAction("getEntry", {
  label: "Get Entry",
  description: "Get a singe entry for a given Entry Type",
  async run({ inCloud, inRequest, params }) {
    const user = inRequest.context.get("user");
    const { entryType, id } = params;
    const entry = await inCloud.orm.getEntry(entryType, id, user);
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
  run({ inCloud, inRequest, params }) {
    const user = inRequest.context.get("user");
    const { entryType } = params;
    const entry = inCloud.orm.getNewEntry(entryType, user);
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

  async run({ inCloud, inRequest, params }) {
    const user = inRequest.context.get("user");
    const { entryType, id, data } = params;
    const entry = await inCloud.orm.getEntry(entryType, id, user);
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
  async run({ inCloud, inRequest, params }) {
    const user = inRequest.context.get("user");
    const { entryType, data } = params;
    const entry = await inCloud.orm.createEntry(entryType, data, user);
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
  async run({ inCloud, inRequest, params }) {
    const user = inRequest.context.get("user");
    const { entryType, id, action, data } = params;

    const entry = await inCloud.orm.getEntry(entryType, id, user);
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
  }],
});

const deleteEntryAction = new CloudAPIAction("deleteEntry", {
  label: "Delete Entry",
  description: "Delete an existing entry",
  async run({ inCloud, inRequest, params }) {
    const user = inRequest.context.get("user");
    const { entryType, id } = params;
    await inCloud.orm.deleteEntry(entryType, id, user);
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
  async run({ inCloud, inRequest, params }) {
    const user = inRequest.context.get("user");
    const { entryType, options } = params;
    const entryList = await inCloud.orm.getEntryList(entryType, options, user);
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
  run({ inCloud, inRequest, params }): EntryTypeInfo {
    const user = inRequest.context.get("user");
    const entryType = inCloud.orm.getEntryType(params.entryType, user);
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
