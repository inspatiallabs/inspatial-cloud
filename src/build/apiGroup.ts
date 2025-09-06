import { EntryType } from "@inspatial/cloud";

export const apiGroup = new EntryType("apiGroup", {
  systemGlobal: true,
  idMode: {
    type: "field",
    field: "groupName",
  },
  titleField: "label",
  defaultListFields: [
    "label",
    "description",
  ],
  label: "API Group",
  description: "A group of related API actions",
  fields: [{
    key: "groupName",
    type: "DataField",
    required: true,
  }, {
    key: "label",
    type: "DataField",
    required: true,
  }, {
    key: "description",
    type: "TextField",
    description: "A short description of the API group",
  }, {
    key: "extensionMeta",
    type: "ConnectionField",
    entryType: "extensionMeta",
    description: "The extension this API group belongs to",
  }],
});
