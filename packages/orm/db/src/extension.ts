import { ServerExtension } from "@inspatial/serve";
import { InSpatialDB } from "#db/inspatial-db.ts";
import { ClientConnectionType } from "#db/types.ts";

export const dbExtension = new ServerExtension("db", {
  description: "InSpatial DB extension",
  config: {
    dbConnectionType: {
      description: "Type of the database connection ('tcp' or 'socket')",
      type: "string",
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
  },

  install(_server, config) {
    let connectionConfig: ClientConnectionType;
    switch (config.dbConnectionType) {
      case "tcp":
        connectionConfig = {
          connectionType: "tcp",
          database: config.dbName,
          host: config.dbHost,
          port: config.dbPort,
          user: config.dbUser,
          password: config.dbPassword,
          schema: config.dbSchema,
        };
        break;
      case "socket":
        connectionConfig = {
          connectionType: "socket",
          database: config.dbName,
          socketPath: config.dbSocketPath,
          user: config.dbUser,
          schema: config.dbSchema,
          password: config.dbPassword,
        };
        break;
      default:
        throw new Error(`Invalid connection type: ${config.dbConnectionType}`);
    }
    const db = new InSpatialDB({
      connection: connectionConfig,
    });

    return db;
  },
});
