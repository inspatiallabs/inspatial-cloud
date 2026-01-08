import { defineChildEntry } from "../orm/child-entry/child-entry.ts";
import { defineEntry } from "../orm/entry/entry-type.ts";
import { ormFields } from "../orm/field/fields.ts";
import type { EntryName } from "#types/models.ts";
import convertString from "../utils/convert-string.ts";

const choices = defineChildEntry("choices", {
  label: "Choice",
  description: "A list of Choices for the ChoicesField",
  idMode: { type: "fields", fields: ["parent", "key"] },
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

export const fieldMeta = defineEntry("fieldMeta", {
  systemGlobal: true,
  label: "Field Meta",
  skipAuditLog: true,
  idMode: {
    type: "fields",
    fields: ["entryMeta", "settingsMeta", "key"],
  },
  titleField: "label",
  defaultListFields: [
    "label",
    "entryMeta",
    "settingsMeta",
    "key",
    "type",
    "description",
    "required",
  ],
  fieldGroups: [{
    key: "generalInfo",
    label: "General Information",
    description: "Basic information about the field.",
    fields: [
      "key",
      "label",
      "type",
      "entryMeta",
      "settingsMeta",
      "description",
    ],
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
  fields: [
    { key: "entryMeta", type: "ConnectionField", entryType: "entryMeta" },
    { key: "settingsMeta", type: "ConnectionField", entryType: "settingsMeta" },
    { key: "key", type: "DataField", required: true },
    { key: "label", type: "DataField", required: true },
    {
      key: "type",
      type: "ChoicesField",
      choices: ormFields.map((f) => ({
        key: f.type,
        label: f.type.replace("Field", ""),
        description: f.description,
      })),
      required: true,
    },
    {
      key: "description",
      type: "TextField",
      description: "A brief description of the field.",
    },
    {
      key: "required",
      type: "BooleanField",
      description: "Whether the field is mandatory.",
    },
    {
      key: "readOnly",
      type: "BooleanField",
      description: "Whether the field is read-only.",
    },
    {
      key: "unique",
      type: "BooleanField",
      description: "Whether the field must have unique values across entries.",
    },
    {
      key: "defaultValue",
      type: "DataField",
      description: "The default value for the field.",
    },
    {
      key: "hidden",
      type: "BooleanField",
      description: "Whether the field is hidden in the UI.",
    },
    {
      key: "placeholder",
      type: "DataField",
      description: "Placeholder text for the field.",
    },
    {
      key: "entryType",
      type: "ConnectionField",
      entryType: "entryMeta",
      description: "The entry type this connection field is associated with.",
      dependsOn: [{
        field: "type",
        value: "ConnectionField",
      }],
    },
  ],
  children: [choices],
});

fieldMeta.addAction("generateConfig", {
  action({ fieldMeta, orm }) {
    const {
      $key,
      $label,
      $description,
      $required,
      $type,
      $unique,
      $choices,
      $hidden,
      $readOnly,
      $defaultValue,
      $placeholder,
      $entryType,
    } = fieldMeta;

    const config = new Map<string, any>();
    config.set("key", $key);
    config.set("type", $type);
    config.set("required", $required || false);
    config.set("unique", $unique || false);
    config.set("hidden", $hidden || false);
    config.set("readyOnly", $readOnly || false);
    if ($defaultValue !== undefined && $defaultValue !== null) {
      config.set("defualtValue", $defaultValue);
    }
    if ($label) {
      config.set("lable", $label);
    }
    if ($description) {
      config.set("description", $description);
    }
    if ($placeholder) {
      config.set("placeholder", $placeholder);
    }
    switch ($type) {
      case "ChoicesField":
        config.set(
          "choices",
          $choices.data.map((c) => ({
            key: c.key,
            label: c.label,
            color: c.color,
            description: c.description,
          })),
        );
        break;
      case "ConnectionField":
        {
          config.set("entryType", $entryType);
          const connectionEntry = orm.getEntryType($entryType as EntryName);
          if (connectionEntry.systemGlobal) {
            config.set("global", true);
          }
        }
        break;
    }
    return Object.fromEntries(config);
  },
});
