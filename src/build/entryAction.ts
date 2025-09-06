import { EntryType } from "@inspatial/cloud";

export const entryAction = new EntryType("entryAction", {
  systemGlobal: true,
  idMode: {
    type: "fields",
    fields: ["entryMeta"],
  },
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
    required: true,
    entryType: "entryMeta",
  }],
});
