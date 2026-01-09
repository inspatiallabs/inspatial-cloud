import { defineChildEntry } from "../orm/child-entry/child-entry.ts";
import { defineEntry } from "../orm/mod.ts";

const settingsHooks = defineChildEntry("hooks", {
  label: "Lifecycle Hooks",
  idMode: {
    type: "fields",
    fields: ["parent", "hook", "name"],
  },
  fields: [{
    key: "hook",
    label: "Hook",
    type: "ChoicesField",
    required: true,
    choices: [{
      key: "beforeUpdate",
      label: "Before Update",
      description: "Called before an existing entry is updated.",
    }, {
      key: "afterUpdate",
      label: "After Update",
      description: "Called after an existing entry is updated.",
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

export const settingsMeta = defineEntry("settingsMeta", {
  systemGlobal: true,
  skipAuditLog: true,
  idMode: {
    type: "field",
    field: "settingsName",
  },
  titleField: "label",
  defaultListFields: ["extensionMeta"],
  fields: [
    { key: "settingsName", type: "DataField", required: true },
    { key: "label", type: "DataField", required: true },
    {
      key: "description",
      type: "TextField",
      description: "A brief description of the settings.",
    },
    {
      key: "systemGlobal",
      type: "BooleanField",
      description:
        "Whether these settings are global to the entire system or specific to an account.",
    },
    {
      key: "extensionMeta",
      label: "Extension",
      type: "ConnectionField",
      entryType: "extensionMeta",
      required: true,
    },
  ],
  children: [settingsHooks],
});
