import { EntryType } from "@inspatial/cloud";

export const apiAction = new EntryType("apiAction", {
  systemGlobal: true,
  idMode: {
    type: "field",
    field: "actionName",
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
    key: "label",
    type: "DataField",
    required: true,
  }, {
    key: "description",
    type: "TextField",
    description: "A short description of the API action",
  }, {
    key: "apiGroup",
    type: "ConnectionField",
    entryType: "apiGroup",
    required: true,
    description: "The API group this action belongs to",
  }],
});
