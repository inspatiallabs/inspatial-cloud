import { CloudExtension } from "/app/cloud-extension.ts";
import ormGroup from "#extensions/orm/actions/orm-group.ts";
import entriesGroup from "#extensions/orm/actions/entries-group.ts";
import settingsGroup from "#extensions/orm/actions/settings-group.ts";
import { PgError } from "/orm/db/postgres/pgError.ts";
import { PGErrorCode } from "/orm/db/postgres/maps/errorMap.ts";
import convertString from "/utils/convert-string.ts";
import { ORMException, raiseORMException } from "/orm/orm-exception.ts";
import type { ExceptionHandlerResponse } from "#types/serve-types.ts";
import type { EntryHookFunction } from "/orm/orm-types.ts";
import { ormConfig } from "./config.ts";
const afterUpdateHook: EntryHookFunction = (
  app,
  { entry, entryType },
) => {
  app.inLive.notify({
    roomName: `${entryType}:${entry.id}`,
    event: "update",
    data: entry.data,
  });
};

const afterCreateHook: EntryHookFunction = (
  app,
  { entry, entryType },
) => {
  app.inLive.notify({
    roomName: entryType,
    event: "create",
    data: entry.data,
  });
};

const afterDeleteHook: EntryHookFunction = (
  app,
  { entry, entryType },
) => {
  app.inLive.notify({
    roomName: entryType,
    event: "delete",
    data: entry.data,
  });
};

const ormCloudExtension: CloudExtension = new CloudExtension("orm", {
  description: "ORM Extension",
  label: "ORM Extension",
  version: "0.0.1",
  actionGroups: [ormGroup, entriesGroup, settingsGroup],
  install(_app, { dbName }) {
    if (!dbName) {
      raiseORMException("Database name is not set in config!", "ORM");
    }
  },
  async boot(app) {
    if (app.mode === "development") {
      if (app.getExtensionConfigValue("orm", "autoTypes")) {
        app.inLog.info(
          "Generating ORM types...",
          "ORM",
        );
        await app.orm.generateInterfaces();
      }
      if (
        app.getExtensionConfigValue("orm", "autoMigrate")
      ) {
        app.inLog.info(
          "Running ORM migrations...",
          "ORM",
        );
        await app.orm.migrate();
      }
    }
  },
  ormGlobalHooks: {
    afterUpdate: [afterUpdateHook],
    afterCreate: [afterCreateHook],
    afterDelete: [afterDeleteHook],
  },
  config: ormConfig,
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
          case PGErrorCode.InvalidCatalogName:
            response.serverMessage = {
              content: error.message,
              subject: "InSpatial ORM - Postgres Error",
              type: "warning",
            };
            response.clientMessage =
              `Database ${error.message} does not exist. Please check your database configuration`;
            response.status = 400;
            response.statusText = "Bad Request";
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
    },
  }],
});

export default ormCloudExtension;
