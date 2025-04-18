import { InSpatialDB } from "#/orm/db/inspatial-db.ts";
import type { ClientConnectionType } from "#/orm/db/db-types.ts";

export const dbExtension: ServerExtension<"db", InSpatialDB> =
  new ServerExtension("db", {
    description: "InSpatial DB extension",
    config: {},

    install(_server, config) {
      let connectionConfig: ClientConnectionType;
      const baseConnectionConfig = {
        user: config.dbUser,
        database: config.dbName,
        schema: config.dbSchema,
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
          throw new Error(
            `Invalid connection type: ${config.dbConnectionType}`,
          );
      }
      const db = new InSpatialDB({
        connection: connectionConfig,
        appName: config.dbAppName,
        clientMode: config.dbClientMode as "single" | "pool" | undefined,
        idleTimeout: config.dbIdleTimeout,
        poolOptions: {
          size: config.dbPoolSize,
          maxSize: config.dbMaxPoolSize,
          idleTimeout: config.dbIdleTimeout,
          lazy: true,
        },
      });

      return db;
    },
  });
