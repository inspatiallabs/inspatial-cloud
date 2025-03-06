import { CloudAction, CloudActionGroup } from "#/cloud-action.ts";

const getEntryAction = new CloudAction("getEntry", {
  description: "Get a singe entry for a given Entry Type",
  async run({ app, inRequest, params }) {
    const { entryType, id } = params;
    const entry = await app.orm.getEntry(entryType, id);
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
  description:
    "Get the default values for a new entry, not saved to the database",
  async run({ app, inRequest, params }) {
    const { entryType } = params;
    const entry = await app.orm.getNewEntry(entryType);
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
  description: "Update an existing entry",
  async run({ app, inRequest, params }) {
    const { entryType, id, data } = params;
    const entry = await app.orm.getEntry(entryType, id);
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
  description: "Create a new entry",
  async run({ app, inRequest, params }) {
    const { entryType, data } = params;
    const entry = await app.orm.createEntry(entryType, data);
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
  description: "Run an action on an entry",
  async run({ app, inRequest, params }) {
    const { entryType, id, action, data } = params;

    const entry = await app.orm.getEntry(entryType, id);
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
  description: "Delete an existing entry",
  async run({ app, inRequest, params }) {
    const { entryType, id } = params;
    await app.orm.deleteEntry(entryType, id);
    return true;
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
  description: "Get a list of entries for a given Entry Type",
  async run({ app, inRequest, params }) {
    const { entryType, options } = params;
    const entryList = await app.orm.getEntryList(entryType, options);
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
const entriesGroup = new CloudActionGroup("entry", {
  description: "CRUD actions for InSpatial ORM Entries",
  actions: [
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
