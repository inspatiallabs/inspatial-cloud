import { EntryType } from "@inspatial/cloud";
import { ChildEntryType } from "../orm/child-entry/child-entry.ts";
import { ormFields } from "../orm/field/fields.ts";

const actionParams = new ChildEntryType("parameters", {
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
export const apiAction = new EntryType("apiAction", {
  systemGlobal: true,
  idMode: {
    type: "fields",
    fields: ["apiGroup", "actionName"],
  },
  titleField: "label",
  defaultListFields: [
    "actionName",
    "label",
    "apiGroup",
  ],
  label: "API Action",
  description: "An action that can be performed via the API",
  fields: [{
    key: "actionName",
    type: "DataField",
    required: true,
  }, {
    key: "apiGroup",
    type: "ConnectionField",
    entryType: "apiGroup",
    required: true,
    description: "The API group this action belongs to",
  }, {
    key: "label",
    type: "DataField",
    required: true,
  }, {
    key: "description",
    type: "TextField",
    description: "A short description of the API action",
  }, {
    key: "authRequired",
    type: "BooleanField",
    description: "Whether authentication is required to access this API action",
    defaultValue: true,
  }, {
    key: "hideFromApi",
    type: "BooleanField",
    description: "Whether to disable this action from client access",
    defaultValue: false,
  }, {
    key: "raw",
    type: "BooleanField",
    description:
      "Whether to skip reading the request body. Should be set to true if the action will be reading the request body itself, such as when uploading files.",
    defaultValue: false,
  }, {
    key: "code",
    type: "CodeField",
    required: true,
    description: "The code to execute for this API action",
  }],
  children: [actionParams],
});
