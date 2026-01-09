import type {
  GlobalHookFunction,
  GlobalSettingsHookFunction,
} from "../orm/orm-types.ts";
import type { EntryName } from "#types/models.ts";
import { dateUtils } from "../utils/date-utils.ts";
import type { InFieldType } from "../orm/field/field-def-types.ts";
import type { Entry } from "../orm/entry/entry.ts";
import type { Settings } from "../orm/settings/settings.ts";
import { getInLog } from "#inLog";

export type LogUpdateField = {
  key: string;
  type: InFieldType;
  label: string;
  from: { value: any; label: string };
  to: { value: any; label: string };
};
export type LogUpdateData = {
  data: Array<LogUpdateField>;
};

export const auditUpdateHook: GlobalHookFunction = async (
  { entry, entryType, orm },
) => {
  if (shouldSkipEntry(entry)) {
    return;
  }
  entry._modifiedValues.delete("updatedAt");
  const changes: Array<LogUpdateField> = [];
  const fields = entry._entryType.fields;
  for (const [key, value] of entry._modifiedValues.entries()) {
    changes.push({
      key,
      type: fields.get(key)?.type || "DataField",
      label: fields.get(key)?.label || key,
      from: { value: value.from, label: value.from },
      to: { value: value.to, label: value.to },
    });
  }
  const user = entry._user?.userId;
  const logName: EntryName = entry._systemGlobal ? "systemLog" : "accountLog";
  const { titleField = "id" } = entry._entryType.config;
  const log = orm.getNewEntry(logName);
  log.$user = user;
  log.$action = "update";
  log.$entryType = entryType;
  log.$entryId = entry.id;
  log.$entryTitle = entry._data.get(titleField);
  log.$modifiedDate = entry._data.get("updatedAt");
  log.$changes = { data: changes };
  await log.save();
};

export const auditCreateHook: GlobalHookFunction = async (
  { entry, entryType, orm },
) => {
  if (shouldSkipEntry(entry)) {
    return;
  }
  const user = entry._user?.userId;
  const logName: EntryName = entry._systemGlobal ? "systemLog" : "accountLog";
  const { titleField = "id" } = entry._entryType.config;
  const log = orm.getNewEntry(logName);
  log.$user = user;
  log.$action = "create";
  log.$entryType = entryType;
  log.$entryId = entry.id;
  log.$entryTitle = entry._data.get(titleField);
  log.$changes = entry.data;
  log.$modifiedDate = entry._data.get("createdAt");
  await log.save();
};

export const auditDeleteHook: GlobalHookFunction = async (
  { entry, entryType, orm },
) => {
  if (shouldSkipEntry(entry)) {
    return;
  }

  const user = entry._user?.userId;
  const logName: EntryName = entry._systemGlobal ? "systemLog" : "accountLog";
  const { titleField = "id" } = entry._entryType.config;
  const log = orm.getNewEntry(logName);
  log.$user = user;
  log.$action = "delete";
  log.$entryType = entryType;
  log.$entryId = entry.id;
  log.$entryTitle = entry._data.get(titleField);
  log.$modifiedDate = entry._data.get("createdAt");
  log.$changes = entry.data;
  await log.save();
};

export const auditUpdateSettingsHook: GlobalSettingsHookFunction = async (
  { settings, orm },
) => {
  if (shouldSkipSettings(settings)) {
    return;
  }
  settings._modifiedValues.delete("updatedAt");
  const changes = Object.fromEntries(settings._modifiedValues);
  const logName: EntryName = settings._systemGlobal
    ? "systemLog"
    : "accountLog";
  const log = orm.getNewEntry(logName);
  log.$user = orm._user?.userId;
  log.$action = "update";
  log.$settingsType = settings._name;
  log.$modifiedDate = dateUtils.nowTimestamp();
  log.$changes = changes;
  await log.save();
};

function shouldSkipEntry(entry: Entry) {
  console.log("checking", entry._name);
  return entry._entryType.config.skipAuditLog || false;
}
function shouldSkipSettings(settings: Settings) {
  return settings._settingsType.config.skipAuditLog || false;
}
