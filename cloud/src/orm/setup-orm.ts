import { InSpatialORM } from "#/orm/inspatial-orm.ts";
import type { ClientConnectionType, DBConfig } from "#/orm/db/db-types.ts";
import type {
  EntryHooks,
  GlobalEntryHooks,
  GlobalHookFunction,
} from "#/orm/orm-types.ts";
import type { InCloud } from "#/inspatial-cloud.ts";
import type { ExtensionManager } from "#/extension-manager/extension-manager.ts";

export function setupOrm(args: {
  app: InCloud;
  extensionManager: ExtensionManager;
}): InSpatialORM {
  const { app, extensionManager } = args;
  const config = extensionManager.getExtensionConfig("orm");
  const globalHooks: GlobalEntryHooks = {
    afterCreate: [],
    beforeCreate: [],
    beforeUpdate: [],
    afterUpdate: [],
    afterDelete: [],
    beforeDelete: [],
    beforeValidate: [],
    validate: [],
  };
  for (const hookName of Object.keys(extensionManager.ormGlobalHooks)) {
    const hooks = extensionManager.ormGlobalHooks[hookName as keyof EntryHooks];
    for (const hook of hooks) {
      const newHook: GlobalHookFunction = async (
        { entry, entryType, orm },
      ) => {
        return await hook(app, { entry, entryType, orm });
      };
      globalHooks[hookName as keyof GlobalEntryHooks].push(newHook);
    }
  }
  let connectionConfig: ClientConnectionType;
  const baseConnectionConfig = {
    user: config.dbUser || "postgres",
    database: config.dbName || "postgres",
    schema: config.dbSchema || "public",
  };

  switch (config.dbConnectionType) {
    case "tcp":
      connectionConfig = {
        ...baseConnectionConfig,
        connectionType: "tcp",
        host: config.dbHost,
        port: config.dbPort,
        password: config.dbPassword,
      };
      break;
    case "socket":
      connectionConfig = {
        ...baseConnectionConfig,
        connectionType: "socket",
        socketPath: config.dbSocketPath,
        password: config.dbPassword,
      };
      break;
    default:
      connectionConfig = {
        ...baseConnectionConfig,
        connectionType: "tcp",
        host: "localhost",
        port: 5432,
        password: "postgres",
        user: "postgres",
        database: "postgres",
      };
  }
  const dbConfig: DBConfig = {
    debug: config.ormDebugMode,
    connection: connectionConfig,
    appName: config.dbAppName,
    clientMode: config.dbClientMode,
    idleTimeout: config.dbIdleTimeout,
    poolOptions: {
      idleTimeout: config.dbIdleTimeout,
      maxSize: config.dbMaxPoolSize,
      size: config.dbPoolSize,
      lazy: true,
    },
  };
  const orm = new InSpatialORM({
    entries: Array.from(extensionManager.entryTypes.values()),
    settings: Array.from(extensionManager.settingsTypes.values()),
    globalEntryHooks: globalHooks,
    dbConfig,
  });
  return orm;
}
