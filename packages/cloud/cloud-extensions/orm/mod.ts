import { CloudExtension } from "#/cloud-extension.ts";
import ormGroup from "#extension/orm/actions/orm-group.ts";
import entriesGroup from "#extension/orm/actions/entries-group.ts";
import { ormServeExtension } from "./serve-extension.ts";
import type { AppHookFunction } from "#/types.ts";
import settingsGroup from "#extension/orm/actions/settings-group.ts";
import cloudLogger from "#/cloud-logger.ts";
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

const ormCloudExtension: CloudExtension = new CloudExtension({
  key: "orm",
  description: "ORM Extension",
  install() {
  },
  title: "ORM Extension",
  version: "0.0.1",
  actionGroups: [ormGroup, entriesGroup, settingsGroup],
  async boot(app) {
    if (app.server.mode === "development") {
      if (app.server.getExtensionConfigValue("orm", "autoTypes")) {
        cloudLogger.info(
          "Generating ORM types...",
          "ORM",
        );
        await app.orm.generateInterfaces();
      }
      if (
        app.server.getExtensionConfigValue("orm", "autoMigrate")
      ) {
        cloudLogger.info(
          "Running ORM migrations...",
          "ORM",
        );
        app.orm.migrate();
      }
    }
  },
  ormGlobalHooks: {
    afterUpdate: [afterUpdateHook],
    afterCreate: [afterCreateHook],
    afterDelete: [afterDeleteHook],
  },
  serverExtensions: [
    ormServeExtension,
  ],
});

export default ormCloudExtension;
