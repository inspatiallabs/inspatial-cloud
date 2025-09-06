import { ormFields } from "../orm/field/fields.ts";

export const actionParams = {
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
};
