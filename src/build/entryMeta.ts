import { ChildEntryType } from "../orm/child-entry/child-entry.ts";
import { EntryType } from "../orm/entry/entry-type.ts";

const entryHooks = new ChildEntryType("hooks", {
  label: "Lifecycle Hooks",
  fields: [{
    key: "hook",
    label: "Hook",
    type: "ChoicesField",
    required: true,
    choices: [{
      key: "beforeCreate",
      label: "Before Create",
      description: "Called before a new entry is created.",
    }, {
      key: "afterCreate",
      label: "After Create",
      description: "Called after a new entry is created.",
    }, {
      key: "beforeUpdate",
      label: "Before Update",
      description: "Called before an existing entry is updated.",
    }, {
      key: "afterUpdate",
      label: "After Update",
      description: "Called after an existing entry is updated.",
    }, {
      key: "beforeDelete",
      label: "Before Delete",
      description: "Called before an entry is deleted.",
    }, {
      key: "afterDelete",
      label: "After Delete",
      description: "Called after an entry is deleted.",
    }, {
      key: "beforeValidate",
      label: "Before Validate",
      description: "Called before an entry is validated.",
    }, {
      key: "validate",
      label: "Validate",
      description: "Called to validate an entry.",
    }],
  }, {
    key: "name",
    type: "DataField",
    required: true,
    description: "The unique name of this hook",
  }, {
    key: "description",
    type: "TextField",
    description: "A brief description of what this hook does.",
  }, {
    key: "handler",
    type: "CodeField",
    required: true,
    description: "The code to execute for this hook",
  }, {
    key: "active",
    type: "BooleanField",
    description: "Whether this hook is active or not.",
  }],
});

export const entryMeta = new EntryType("entryMeta", {
  systemGlobal: true,
  idMode: {
    type: "field",
    field: "name",
  },
  titleField: "label",
  searchFields: ["extension"],
  defaultListFields: ["label", "extension", "systemGlobal"],
  fields: [{
    key: "name",
    type: "DataField",
    required: true,
    readOnly: true,
    description: "The unique name of this entry type",
    unique: true,
  }, {
    key: "label",
    type: "DataField",
    required: true,
  }, {
    key: "description",
    type: "TextField",
  }, {
    key: "extension",
    type: "ConnectionField",
    entryType: "extensionMeta",
    description: "The extension this entry type belongs to",
  }, {
    key: "titleField",
    type: "DataField",
    description:
      "The field to use as the title when displaying this entry type",
  }, {
    key: "systemGlobal",
    type: "BooleanField",
  }],
  children: [entryHooks],
});
