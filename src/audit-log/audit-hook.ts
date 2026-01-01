import type {
  GlobalHookFunction,
  GlobalSettingsHookFunction,
} from "../orm/orm-types.ts";
import type { EntryName } from "#types/models.ts";
import { dateUtils } from "../utils/date-utils.ts";

const skip: Set<EntryName> = new Set(["accountLog", "systemLog"]);
export const auditUpdateHook: GlobalHookFunction = async (
  { entry, entryType, orm },
) => {
  if (skip.has(entryType as EntryName)) return;
  entry._modifiedValues.delete("updatedAt");
  const changes = Object.fromEntries(entry._modifiedValues);
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
  log.$changes = changes;
  await log.save();
};

export const auditCreateHook: GlobalHookFunction = async (
  { entry, entryType, orm },
) => {
  if (skip.has(entryType as EntryName)) return;
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
  if (skip.has(entryType as EntryName)) return;

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
