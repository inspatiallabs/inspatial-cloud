import { CloudExtension } from "#/cloud-extension.ts";
import ormGroup from "#extension/orm/actions/orm-group.ts";
import entriesGroup from "#extension/orm/actions/entries-group.ts";
import { ormServeExtension } from "#extension/orm/serveExtension.ts";
import { AppHookFunction } from "#/types.ts";
const afterUpdateHook: AppHookFunction = (
  app,
  { entry, entryType, orm },
) => {
  app.realtime.notify({
    roomName: `${entryType}:${entry.id}`,
    event: "update",
    data: entry.data,
  });
};

const afterCreateHook: AppHookFunction = (
  app,
  { entry, entryType, orm },
) => {
  app.realtime.notify({
    roomName: entryType,
    event: "create",
    data: entry.data,
  });
};

const afterDeleteHook: AppHookFunction = (
  app,
  { entry, entryType, orm },
) => {
  app.realtime.notify({
    roomName: entryType,
    event: "delete",
    data: entry.data,
  });
};

export const ormExtension = new CloudExtension({
  key: "orm",
  description: "ORM Extension",
  install(app) {
  },
  title: "ORM Extension",
  version: "0.0.1",
  actionGroups: [ormGroup, entriesGroup],
  ormGlobalHooks: {
    afterUpdate: [afterUpdateHook],
    afterCreate: [afterCreateHook],
    afterDelete: [afterDeleteHook],
  },
  serverExtensions: [
    ormServeExtension,
  ],
});
