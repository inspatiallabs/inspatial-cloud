import { ChildEntryType } from "../orm/child-entry/child-entry.ts";
import { EntryType } from "../orm/entry/entry-type.ts";
import { ormFields } from "../orm/field/fields.ts";
import convertString from "../utils/convert-string.ts";

const choices = new ChildEntryType("choices", {
  label: "Choice",
  description: "A list of Choices for the ChoicesField",
  fields: [{
    key: "key",
    type: "DataField",
    required: true,
    description: "The unique key for this choice.",
  }, {
    key: "label",
    type: "DataField",
    required: true,
    description: "The human-readable label for this choice.",
  }, {
    key: "description",
    type: "TextField",
    description: "A brief description of the choice.",
  }, {
    key: "color",
    type: "ChoicesField",
    description: "A color associated with this choice (e.g., for UI display).",
    choices: [
      "primary",
      "secondary",
      "success",
      "warning",
      "error",
      "info",
      "accent",
      "muted",
    ].map((color) => ({
      key: color,
      label: convertString(color, "title"),
      color,
    })),
  }],
});

export const fieldMeta = new EntryType("fieldMeta", {
  systemGlobal: true,
  label: "Field Meta",
  description: "",
  idMode: {
    type: "fields",
    fields: ["entryMeta", "key"],
  },
  titleField: "label",
  defaultListFields: [
    "label",
    "entryMeta",
    "key",
    "type",
    "description",
    "required",
  ],
  fieldGroups: [{
    key: "generalInfo",
    label: "General Information",
    description: "Basic information about the field.",
    fields: ["key", "label", "type", "entryMeta"],
  }, {
    key: "common",
    label: "Common Attributes",
    description: "Common attributes for all field types.",
    fields: [
      "description",
      "required",
      "readOnly",
      "unique",
      "defaultValue",
      "hidden",
      "placeholder",
    ],
  }, {
    key: "connection",
    label: "Connection Field",
    fields: ["entryType"],
    description: "Attributes specific to connection fields.",
  }],
  fields: [{
    key: "entryMeta",
    type: "ConnectionField",
    entryType: "entryMeta",
    required: true,
  }, {
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
    key: "readOnly",
    type: "BooleanField",
    description: "Whether the field is read-only.",
  }, {
    key: "unique",
    type: "BooleanField",
    description: "Whether the field must have unique values across entries.",
  }, {
    key: "defaultValue",
    type: "DataField",
    description: "The default value for the field.",
  }, {
    key: "hidden",
    type: "BooleanField",
    description: "Whether the field is hidden in the UI.",
  }, {
    key: "placeholder",
    type: "DataField",
    description: "Placeholder text for the field.",
  }, {
    key: "entryType",
    type: "ConnectionField",
    entryType: "entryMeta",
    description: "The entry type this connection field is associated with.",
    dependsOn: [{
      field: "type",
      value: "ConnectionField",
    }],
  }],
  children: [choices],
});
