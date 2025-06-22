import type {
  ConfigDefinition,
  ExtensionConfig,
} from "/cloud-config/config-types.ts";

export const ormConfig = {
  autoTypes: {
    description:
      "Automatically generate the ORM interfaces and types when the server starts and `SERVE_MODE` is set to `development`",
    required: false,
    type: "boolean",
    default: true,
  },
  autoMigrate: {
    description:
      "Automatically run the migrations when the server starts and `SERVE_MODE` is set to `development`",
    required: false,
    type: "boolean",
    default: true,
  },
  embeddedDb: {
    description:
      "Use an embedded database for development purposes. This will use an embedded WASM version of Postgres.",
    type: "boolean",
    default: true,
    required: false,
  },
  embeddedDbPort: {
    description: "The port to run the embedded database on",
    type: "number",
    default: 11527,
    required: true,
    dependsOn: {
      key: "embeddedDb",
      value: true,
    },
  },
  ormDebugMode: {
    description:
      "Enable debug mode for the ORM. This will log all database queries to the console.",
    type: "boolean",
    default: false,
    required: false,
  },
  dbConnectionType: {
    description: "Type of the database connection ('tcp' or 'socket')",
    type: "string",
    enum: ["tcp", "socket"],
    default: "tcp",
    dependsOn: {
      key: "embeddedDb",
      value: false,
    },
  },
  dbSocketPath: {
    type: "string",
    dependsOn: {
      key: "dbConnectionType",
      value: "socket",
    },
    description: "Path to the database socket",
    default: "/var/run/postgresql/.s.PGSQL.5432",
  },
  dbName: {
    type: "string",
    description: "Name of the database",
    default: "inspatial",
    dependsOn: {
      key: "embeddedDb",
      value: false,
    },
  },
  dbHost: {
    type: "string",
    description: "Host of the database",
    default: "localhost",
    dependsOn: [{
      key: "dbConnectionType",
      value: "tcp",
    }, {
      key: "embeddedDb",
      value: false,
    }],
  },
  dbPort: {
    type: "number",
    description: "Port of the database",
    default: 5432,
    dependsOn: [{
      key: "dbConnectionType",
      value: "tcp",
    }, {
      key: "embeddedDb",
      value: false,
    }],
  },
  dbUser: {
    type: "string",
    description: "User of the database",
    default: "postgres",
    dependsOn: {
      key: "embeddedDb",
      value: false,
    },
  },
  dbPassword: {
    type: "string",
    description: "Password of the database",
    default: "postgres",
    dependsOn: [{
      key: "dbConnectionType",
      value: "tcp",
    }, {
      key: "embeddedDb",
      value: false,
    }],
  },
  dbSchema: {
    type: "string",
    description: "Schema of the database",
    default: "public",
    required: false,
    dependsOn: {
      key: "embeddedDb",
      value: false,
    },
  },
  dbAppName: {
    type: "string",
    description: "Application name for the database connection",
    default: "InSpatial",
    dependsOn: {
      key: "embeddedDb",
      value: false,
    },
  },
  dbClientMode: {
    type: "string",
    enum: ["pool", "single"],
    description: "Client mode for the database connection",
    default: "single",
    dependsOn: {
      key: "embeddedDb",
      value: false,
    },
  },
  dbPoolSize: {
    type: "number",
    description: "The number of clients in the pool",
    default: 1,
    dependsOn: {
      key: "embeddedDb",
      value: false,
    },
  },
  dbMaxPoolSize: {
    type: "number",
    description: "The maximum number of clients in the pool",
    default: 10,
    dependsOn: {
      key: "embeddedDb",
      value: false,
    },
  },
  dbIdleTimeout: {
    type: "number",
    description: "The idle timeout for the pool",
    default: 5000,
    dependsOn: {
      key: "embeddedDb",
      value: false,
    },
  },
} satisfies ConfigDefinition;

export type ORMConfig = ExtensionConfig<typeof ormConfig>;
