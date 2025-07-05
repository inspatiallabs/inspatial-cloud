import type { EntryHookFunction } from "~/orm/orm-types.ts";

export const notifyUpdate: EntryHookFunction = (
  app,
  { entry, entryType },
) => {
  app.inLive.notify({
    roomName: `${entryType}:${entry.id}`,
    event: "update",
    data: entry.data,
  });
};

export const notifyCreate: EntryHookFunction = (
  app,
  { entry, entryType },
) => {
  app.inLive.notify({
    roomName: entryType,
    event: "create",
    data: entry.data,
  });
};

export const notifyDelete: EntryHookFunction = (
  app,
  { entry, entryType },
) => {
  app.inLive.notify({
    roomName: entryType,
    event: "delete",
    data: entry.data,
  });
};
