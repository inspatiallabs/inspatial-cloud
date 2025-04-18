import type { AppHookFunction } from "#/app/types.ts";
import { CloudExtension } from "#/app/cloud-extension.ts";
import ormGroup from "#extensions/orm/actions/orm-group.ts";
import entriesGroup from "#extensions/orm/actions/entries-group.ts";
import settingsGroup from "#extensions/orm/actions/settings-group.ts";
import cloudLogger from "#/app/cloud-logger.ts";
import { ClientConnectionType } from "#/orm/db/db-types.ts";
import { ExceptionHandlerResponse } from "#types/serve-types.ts";
import { PgError } from "#/orm/db/postgres/pgError.ts";
import { PGErrorCode } from "#/orm/db/postgres/maps/errorMap.ts";
import convertString from "#/utils/convert-string.ts";
import { ORMException } from "#/orm/orm-exception.ts";
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
    if (app.mode === "development") {
      if (app.getExtensionConfigValue("orm", "autoTypes")) {
        cloudLogger.info(
          "Generating ORM types...",
          "ORM",
        );
        await app.orm.generateInterfaces();
      }
      if (
        app.getExtensionConfigValue("orm", "autoMigrate")
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
  config: {
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
  exceptionHandlers: [{
    name: "orm",
    handler(error): ExceptionHandlerResponse | undefined {
      if (error instanceof PgError) {
        const response: ExceptionHandlerResponse = {
          serverMessage: {
            content:
              `${error.name}(${error.code}): ${error.message}\n\tQuery: ${error.query} \n\tDetail: ${error.detail}`,
            subject: "InSpatial ORM - Postgres Error",
            type: error.severity === "ERROR" ? "error" : "warning",
          },
          clientMessage: "An error occurred while processing your request",
          status: 500,
          statusText: "Internal Server Error",
        };
        switch (error.code) {
          case PGErrorCode.UndefinedColumn:
            response.clientMessage = `${
              convertString(
                error.message.split('"')[1],
                "camel",
              )
            } field does not exist in the database. You may need to run a migration`;
            response.status = 400;
            response.statusText = "Bad Request";
            break;
          case PGErrorCode.ForeignKeyViolation:
            response.clientMessage = error.detail;
            response.status = 400;
            response.statusText = "Cannot Delete";
            break;
        }
        return response;
      }
      if (error instanceof ORMException) {
        return {
          serverMessage: {
            content: `${error.message}`,
            subject: error.subject,
            type: error.type,
          },
          clientMessage: error.message,
          status: error.responseCode || 500,
          statusText: error.subject || "Internal Server Error",
        };
      }

      // if (error instanceof Error) {
      //   return {
      //     serverMessage: {
      //       content: error.message,
      //       subject: "InSpatial ORM - Unknown Error",
      //       type: "error",
      //     },
      //     clientMessage: "An unknown error occurred",
      //     status: 500,
      //     statusText: "Internal Server Error",
      //   };
      // }
      // return {
      //   serverMessage: {
      //     content: "An unknown error occurred",
      //     subject: "InSpatial ORM - Unknown Error",
      //     type: "error",
      //   },
      //   clientMessage: "An unknown error occurred",
      //   status: 500,
      //   statusText: "Internal Server Error",
      // };
    },
  }],
});

export default ormCloudExtension;
