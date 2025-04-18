import { CloudAction, CloudActionGroup } from "#/app/cloud-action.ts";
import { EntryTypeInfo } from "#/orm/entry/types.ts";

const getEntryAction = new CloudAction("getEntry", {
  label: "Get Entry",
  description: "Get a singe entry for a given Entry Type",
  async run({ app, inRequest, params }) {
    const user = inRequest.context.get("user");
    const { entryType, id } = params;
    const entry = await app.orm.getEntry(entryType, id, user);
    return entry.data;
  },
  params: [{
    key: "entryType",
    type: "string",
    label: "Entry Type",
    description: "The Entry Type to get",
    required: true,
  }, {
    key: "id",
    type: "string",
    label: "ID",
    description: "The ID of the Entry to get",
    required: true,
  }],
});

const newEntryAction = new CloudAction("getNewEntry", {
  label: "Get New Entry",
  description:
    "Get the default values for a new entry, not saved to the database",
  run({ app, inRequest, params }) {
    const user = inRequest.context.get("user");
    const { entryType } = params;
    const entry = app.orm.getNewEntry(entryType, user);
    return entry.data;
  },
  params: [{
    key: "entryType",
    type: "string",
    label: "Entry Type",
    description: "The Entry Type to get",
    required: true,
  }],
});

const updateEntryAction = new CloudAction("updateEntry", {
  label: "Update Entry",
  description: "Update an existing entry",

  async run({ app, inRequest, params }) {
    const user = inRequest.context.get("user");
    const { entryType, id, data } = params;
    const entry = await app.orm.getEntry(entryType, id, user);
    entry.update(data);
    await entry.save();
    return entry.data;
  },
  params: [{
    key: "entryType",
    type: "string",
    label: "Entry Type",
    description: "The Entry Type to update",
    required: true,
  }, {
    key: "id",
    type: "string",
    label: "ID",
    description: "The ID of the Entry to update",
    required: true,
  }, {
    key: "data",
    type: "object",
    label: "Data",
    description: "The data to update the entry with",
    required: true,
  }],
});

const createEntryAction = new CloudAction("createEntry", {
  label: "Create Entry",
  description: "Create a new entry",
  async run({ app, inRequest, params }) {
    const user = inRequest.context.get("user");
    const { entryType, data } = params;
    const entry = await app.orm.createEntry(entryType, data, user);
    return entry.data;
  },
  params: [{
    key: "entryType",
    type: "string",
    label: "Entry Type",
    description: "The Entry Type to create",
    required: true,
  }, {
    key: "data",
    type: "object",
    label: "Data",
    description: "The data to create the entry with",
    required: true,
  }],
});

const runEntryAction = new CloudAction("runEntryAction", {
  label: "Run Entry Action",
  description: "Run an action on an entry",
  async run({ app, inRequest, params }) {
    const user = inRequest.context.get("user");
    const { entryType, id, action, data } = params;

    const entry = await app.orm.getEntry(entryType, id, user);
    return await entry.runAction(action, data);
  },
  params: [{
    key: "entryType",
    type: "string",
    label: "Entry Type",
    description: "The Entry Type to run the action on",
    required: true,
  }, {
    key: "id",
    type: "string",
    label: "ID",
    description: "The ID of the Entry to run the action on",
    required: true,
  }, {
    key: "action",
    type: "string",
    label: "Action",
    description: "The action to run",
    required: true,
  }, {
    key: "data",
    type: "object",
    label: "Data",
    description: "The data to run the action with",
    required: false,
  }],
});

const deleteEntryAction = new CloudAction("deleteEntry", {
  label: "Delete Entry",
  description: "Delete an existing entry",
  async run({ app, inRequest, params }) {
    const user = inRequest.context.get("user");
    const { entryType, id } = params;
    await app.orm.deleteEntry(entryType, id, user);
    return {
      entryType,
      id,
      deleted: true,
    };
  },
  params: [{
    key: "entryType",
    type: "string",
    label: "Entry Type",
    description: "The Entry Type to delete",
    required: true,
  }, {
    key: "id",
    type: "string",
    label: "ID",
    description: "The ID of the Entry to delete",
    required: true,
  }],
});

const getEntryListAction = new CloudAction("getEntryList", {
  label: "Get Entry List",
  description: "Get a list of entries for a given Entry Type",
  async run({ app, inRequest, params }) {
    const user = inRequest.context.get("user");
    const { entryType, options } = params;
    const entryList = await app.orm.getEntryList(entryType, options, user);
    return entryList;
  },
  params: [{
    key: "entryType",
    type: "string",
    label: "Entry Type",
    description: "The Entry Type to list",
    required: true,
  }, {
    key: "options",
    type: "object",
    label: "Options",
    description: "Options for the list",
    required: false,
  }],
});

const getEntryTypeInfoAction = new CloudAction("getEntryTypeInfo", {
  label: "Get Entry Type Info",
  description: "Get the Entry Type definition for a given Entry Type",
  run({ app, inRequest, params }): EntryTypeInfo {
    const user = inRequest.context.get("user");
    const entryType = app.orm.getEntryType(params.entryType, user);
    return entryType.info;
  },
  params: [{
    key: "entryType",
    type: "string",
    label: "Entry Type",
    description: "The Entry Type to get the schema for",
    required: true,
  }],
});
const entriesGroup = new CloudActionGroup("entry", {
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
