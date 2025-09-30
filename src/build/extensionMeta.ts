import { EntryType } from "@inspatial/cloud";

export const extensionMeta = new EntryType("extensionMeta", {
  label: "Cloud Extension",
  description: "",
  systemGlobal: true,
  titleField: "label",
  defaultListFields: ["key", "label", "icon", "description", "version"],
  idMode: {
    type: "field",
    field: "key",
  },
  fields: [{
    key: "key",
    type: "DataField",
    readOnly: true,
    hidden: true,
  }, {
    key: "label",
    type: "DataField",
    required: true,
  }, {
    key: "description",
    type: "TextField",
  }, {
    key: "icon",
    type: "DataField",
  }, {
    key: "version",
    type: "DataField",
    description: "The version of this extension",
  }],
});
