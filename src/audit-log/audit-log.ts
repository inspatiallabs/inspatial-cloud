import { defineEntry } from "../orm/entry/entry-type.ts";


export const auditLog = defineEntry("auditLog", {
  defaultListFields: ["user", "entryType"],
  fields: [{
    key: "user",
    type: "ConnectionField",
    entryType: "user",
  }, {
    key: "data",
    type: "JSONField",
  }, {
    key: "entryType",
    type: "ConnectionField",
    entryType: "entryMeta",
  }],
});