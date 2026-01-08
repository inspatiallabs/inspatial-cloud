import { ChildEntryType, EntryType } from "@inspatial/cloud";
import { ormFields } from "../orm/field/fields.ts";
import { defineEntry } from "../orm/mod.ts";
import { defineChildEntry } from "../orm/child-entry/child-entry.ts";

const actionParams = defineChildEntry("parameters", {
  idMode: { type: "fields", fields: ["parent", "key"] },
  label: "Input Parameters",

  fields: [{
    key: "key",
    type: "DataField",
    required: true,
  }, {
    key: "label",
    type: "DataField",
    required: true,
  }, {
    key: "type",
    type: "ChoicesField",
    choices: ormFields.map((f) => ({
      key: f.type,
      label: f.type.replace("Field", ""),
      description: f.description,
    })),
    required: true,
  }, {
    key: "description",
    type: "TextField",
    description: "A brief description of the field.",
  }, {
    key: "required",
    type: "BooleanField",
    description: "Whether the field is mandatory.",
  }, {
    key: "entryType",
    type: "ConnectionField",
    entryType: "entryMeta",
    description:
      "The entry type this parameter connects to. Only used if type is ConnectionField.",
  }],
});

export const actionMeta = defineEntry("actionMeta", {
  systemGlobal: true,
  skipAuditLog: true,
  idMode: {
    type: "fields",
    fields: ["entryMeta", "settingsMeta", "key"],
  },
  defaultListFields: [
    "label",
    "key",
    "entryMeta",
    "settingsMeta",
    "description",
  ],
  titleField: "label",
  fields: [{
    key: "key",
    type: "DataField",
    required: true,
  }, {
    key: "label",
    type: "DataField",
    required: true,
  }, {
    key: "entryMeta",
    type: "ConnectionField",
    entryType: "entryMeta",
  }, {
    key: "settingsMeta",
    type: "ConnectionField",
    entryType: "settingsMeta",
  }, {
    key: "description",
    type: "TextField",
  }, {
    key: "private",
    type: "BooleanField",
    description:
      "Set to true to hide this action from the api. This means it can only be called from server side code.",
  }, {
    key: "code",
    type: "CodeField",
    required: true,
    readOnly: true,
    description: "The code to execute for this action",
  }],
  children: [actionParams],
});
