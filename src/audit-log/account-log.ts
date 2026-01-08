import { defineEntry } from "../orm/entry/entry-type.ts";
import type { InField } from "../orm/field/field-def-types.ts";
const fields: InField[] = [
  { key: "user", type: "ConnectionField", entryType: "user", readOnly: true },
  { key: "systemAdmin", type: "BooleanField", readOnly: true },
  {
    key: "action",
    type: "ChoicesField",
    defaultValue: "update",
    required: true,
    choices: [
      { key: "create", label: "Created", color: "success" },
      { key: "update", label: "Updated", color: "primary" },
      { key: "delete", label: "Deleted", color: "error" },
    ],
  },
  { key: "changes", type: "JSONField", readOnly: true },
  {
    key: "entryType",
    type: "ConnectionField",
    entryType: "entryMeta",
    readOnly: true,
  },
  {
    key: "settingsType",
    type: "ConnectionField",
    entryType: "settingsMeta",
    readOnly: true,
  },
  { key: "entryId", type: "DataField", readOnly: true },
  { key: "entryTitle", type: "DataField", readOnly: true },
  { key: "modifiedDate", type: "TimeStampField", readOnly: true },
];
const defaultListFields = [
  "user",
  "action",
  "settingsType",
  "entryType",
  "entryTitle",
  "entryId",
  "modifiedDate",
  "systemAdmin",
] as any[];
export const accountLog = defineEntry("accountLog", {
  index: [{ fields: ["entryType", "entryId"] }],
  skipAuditLog: true,
  defaultListFields,
  fields,
});
accountLog.addHook("beforeCreate", {
  name: "setSystemAdminUser",
  handler({ accountLog }) {
    if (accountLog.$user === "systemAdmin") {
      accountLog.$user = null;
      accountLog.$user__title = null;
      accountLog.$systemAdmin = true;
    }
  },
});

export const systemLog = defineEntry("systemLog", {
  index: [{ fields: ["entryType", "entryId"] }],
  systemGlobal: true,
  skipAuditLog: true,
  defaultListFields,
  fields,
});

systemLog.addHook("beforeCreate", {
  name: "setSystemAdminUser",
  handler({ systemLog }) {
    if (systemLog.$user === "systemAdmin") {
      systemLog.$user = null;
      systemLog.$user__title = null;
      systemLog.$systemAdmin = true;
    }
  },
});
