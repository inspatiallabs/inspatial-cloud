import { EntryType } from "@inspatial/cloud";
import type { EntryMeta } from "./_entry-meta.type.ts";

export const entryMeta = new EntryType<EntryMeta>("entryMeta", {
  systemGlobal: true,
  idMode: {
    type: "field",
    field: "name",
  },
  titleField: "label",
  searchFields: ["extension"],
  defaultListFields: ["label", "extension", "systemGlobal"],
  fields: [{
    key: "name",
    type: "DataField",
    required: true,
    readOnly: true,
    description: "The unique name of this entry type",
    unique: true,
  }, {
    key: "label",
    type: "DataField",
    required: true,
  }, {
    key: "description",
    type: "TextField",
  }, {
    key: "extension",
    type: "ConnectionField",
    entryType: "extensionMeta",
    description: "The extension this entry type belongs to",
  }, {
    key: "titleField",
    type: "DataField",
    description:
      "The field to use as the title when displaying this entry type",
  }, {
    key: "systemGlobal",
    type: "BooleanField",
  }],
});
