import { InSpatialORM } from "~/orm/inspatial-orm.ts";
import type { ClientConnectionType, DBConfig } from "~/orm/db/db-types.ts";
import type {
  EntryHooks,
  GlobalEntryHooks,
  GlobalSettingsHooks,
} from "~/orm/orm-types.ts";

import type { ExtensionManager } from "~/extension/extension-manager.ts";
import type { InCloud } from "~/in-cloud.ts";

export function setupOrm(args: {
  inCloud: InCloud;
  dbClientQuery?: (query: string) => Promise<any>;
  extensionManager: ExtensionManager;
}): InSpatialORM {
  const { inCloud, extensionManager } = args;
  const config = extensionManager.getExtensionConfig("core");
  const globalEntryHooks: GlobalEntryHooks = {
    afterCreate: [],
    beforeCreate: [],
    beforeUpdate: [],
    afterUpdate: [],
    afterDelete: [],
    beforeDelete: [],
    beforeValidate: [],
    validate: [],
  };
  const globalSettingsHooks: GlobalSettingsHooks = {
    afterUpdate: [],
    beforeUpdate: [],
    beforeValidate: [],
    validate: [],
  };
  for (const hookName of Object.keys(extensionManager.ormGlobalEntryHooks)) {
    const hooks =
      extensionManager.ormGlobalEntryHooks[hookName as keyof EntryHooks];
    for (const hook of hooks) {
      globalEntryHooks[hookName as keyof GlobalEntryHooks].push(hook);
    }
  }
  for (
    const hookName of Object.keys(
      extensionManager.ormGlobalSettingsHooks,
    )
  ) {
    const hooks = extensionManager.ormGlobalSettingsHooks[
      hookName as keyof GlobalSettingsHooks
    ];
    for (const hook of hooks) {
      globalSettingsHooks[hookName as keyof GlobalSettingsHooks].push(hook);
    }
  }
  let connectionConfig: ClientConnectionType;
  const baseConnectionConfig = {
    user: config.dbUser || "postgres",
    database: config.dbName || "postgres",
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

  if (config.embeddedDb) {
    dbConfig.clientMode = "dev";
    dbConfig.connection.connectionType = "tcp";
    dbConfig.connection = {
      host: "127.0.0.1",
      port: config.embeddedDbPort,
    } as any;
  }
  const orm = new InSpatialORM({
    entries: Array.from(extensionManager.entryTypes.values()),
    settings: Array.from(extensionManager.settingsTypes.values()),
    globalEntryHooks,
    globalSettingsHooks,
    dbConfig: args.dbClientQuery ? { query: args.dbClientQuery } : dbConfig,
    inCloud,
  });
  return orm;
}
