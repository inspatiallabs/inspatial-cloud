import type {
  GlobalHookFunction,
  GlobalSettingsHookFunction,
} from "~/orm/orm-types.ts";

export const notifyUpdate: GlobalHookFunction = (
  { inCloud: { inLive }, entry, entryType },
) => {
  if (entry._db._schema === undefined) {
    return;
  }
  inLive.notify({
    accountId: entry._db._schema!,
    roomName: `entry:${entryType}:${entry.id}`,
    event: "update",
    data: entry.data,
  });
  inLive.notify({
    accountId: entry._db._schema!,
    roomName: `entryType:${entryType}`,
    event: "update",
    data: entry.data,
  });
};

export const notifyCreate: GlobalHookFunction = (
  { inCloud: { inLive }, entry, entryType },
) => {
  if (entry._db.schema === undefined) {
    return;
  }

  inLive.notify({
    accountId: entry._db._schema!,
    roomName: `entryType:${entryType}`,
    event: "create",
    data: entry.data,
  });
};

export const notifyDelete: GlobalHookFunction = (
  { inCloud: { inLive }, entry, entryType },
) => {
  if (entry._db.schema === undefined) {
    return;
  }
  inLive.notify({
    accountId: entry._db._schema!,
    roomName: `entry:${entryType}:${entry.id}`,
    event: "delete",
    data: entry.data,
  });
  inLive.notify({
    accountId: entry._db._schema!,
    roomName: `entryType:${entryType}`,
    event: "delete",
    data: entry.data,
  });
};

export const notifySettings: GlobalSettingsHookFunction = (
  { inCloud: { inLive }, settings },
) => {
  if (!settings._db.schema === undefined) {
    return;
  }
  inLive.notify({
    accountId: settings._db._schema!,
    roomName: `settings:${settings._name}`,
    event: "update",
    data: {
      data: settings.data,
      updatedAt: settings.updatedAt,
    },
  });
};
