import { ServerExtension } from "@inspatial/serve";
import { InSpatialDB } from "#db/inspatial-db.ts";
import type { ClientConnectionType } from "#db/types.ts";

export const dbExtension: ServerExtension<"db", InSpatialDB> =
  new ServerExtension("db", {
    description: "InSpatial DB extension",
    config: {
      dbConnectionType: {
        description: "Type of the database connection ('tcp' or 'socket')",
        type: "string",
        enum: ["tcp", "socket"],
        default: "tcp",
      },
      dbSocketPath: {
        type: "string",
        description: "Path to the database socket",
        default: "/var/run/postgresql/.s.PGSQL.5432",
      },
      dbName: {
        type: "string",
        description: "Name of the database",
        default: "postgres",
      },
      dbHost: {
        type: "string",
        description: "Host of the database",
        default: "localhost",
      },
      dbPort: {
        type: "number",
        description: "Port of the database",
        default: 5432,
      },
      dbUser: {
        type: "string",
        description: "User of the database",
        default: "postgres",
      },
      dbPassword: {
        type: "string",
        description: "Password of the database",
        default: "postgres",
      },
      dbSchema: {
        type: "string",
        description: "Schema of the database",
        default: "public",
        required: false,
      },
      dbAppName: {
        type: "string",
        description: "Application name for the database connection",
        default: "InSpatial",
      },
      dbClientMode: {
        type: "string",
        enum: ["pool", "single"],
        description: "Client mode for the database connection",
        default: "pool",
      },
      dbPoolSize: {
        type: "number",
        description: "The number of clients in the pool",
        default: 1,
      },
      dbMaxPoolSize: {
        type: "number",
        description: "The maximum number of clients in the pool",
        default: 10,
      },
      dbIdleTimeout: {
        type: "number",
        description: "The idle timeout for the pool",
        default: 5000,
      },
    },

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
