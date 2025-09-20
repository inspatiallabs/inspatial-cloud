import type { GlobalHookFunction } from "../orm/orm-types.ts";

export const auditHook: GlobalHookFunction = async (
  { entry, entryType, inCloud, orm },
) => {
  const changes = Object.fromEntries(entry._modifiedValues);
  await orm.createEntry("auditLog", {
    user: entry._user?.userId,
    entryType,
    data: {
      entryId: entry.id,
      changes,
      timestamp: new Date().toISOString(),
    },
  });
};
