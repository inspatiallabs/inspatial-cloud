import { CloudExtension } from "~/extension/cloud-extension.ts";

import { apiPathHandler } from "~/api/api-handler.ts";
import {
  inTask,
  inTaskGlobal,
} from "~/in-queue/entry-types/in-task/in-task.ts";
import { staticFilesHandler } from "~/static/staticPathHandler.ts";
import type { ExceptionHandlerResponse } from "#types/serve-types.ts";
import {
  notifyCreate,
  notifyDelete,
  notifyUpdate,
} from "./orm-hooks/in-live-notify.ts";
import { PGErrorCode } from "~/orm/db/postgres/maps/errorMap.ts";
import { ORMException } from "~/orm/orm-exception.ts";
import convertString from "~/utils/convert-string.ts";

import { inLiveMiddleware } from "~/in-live/in-live-middleware.ts";
import { devActions } from "./action-groups/dev-actions.ts";
import { PgError } from "../orm/db/postgres/pgError.ts";
import { systemSettings } from "./settings/systemSettings.ts";
import { corsMiddleware } from "../serve/cors.ts";
import { cloudFile, globalCloudFile } from "../files/entries/cloud-file.ts";
import filesGroup from "../files/actions/files-group.ts";
import {
  entriesGroup,
  ormGroup,
  settingsGroup,
} from "~/orm/api-actions/groups.ts";
import { authLifecycle } from "../auth/auth-lifecycle.ts";
import { authMiddleware } from "../auth/auth-middleware.ts";
import { userEntry } from "~/auth/entries/user/user-entry.ts";
import { userSessionEntry } from "~/auth/entries/user-session/user-session-entry.ts";
import { account } from "~/auth/entries/account/account.ts";
import { authSettings } from "~/auth/settings/auth-settings.ts";
import authGroup from "~/auth/auth-group.ts";
import { initAdminAccount } from "../auth/migrate/init-admin-account.ts";
import { emailGroup } from "../email/actions/email-group.ts";
import { emailSettings } from "../email/settings/emailSettings.ts";
import { emailEntry } from "../email/entries/email.ts";
import { emailAccountEntry } from "../email/entries/emailAccount.ts";
export const coreExtension = new CloudExtension("core", {
  description: "InSpatial Cloud Core Extension",
  label: "Core",
  version: "0.0.1",
  ormGlobalHooks: {
    afterUpdate: [notifyUpdate],
    afterCreate: [notifyCreate],
    afterDelete: [notifyDelete],
  },
  actionGroups: [
    authGroup,
    entriesGroup,
    ormGroup,
    settingsGroup,
    devActions,
    filesGroup,
    emailGroup,
  ],
  settingsTypes: [systemSettings, authSettings, emailSettings],
  entryTypes: [
    userEntry,
    userSessionEntry,
    account,
    inTask,
    inTaskGlobal,
    cloudFile,
    globalCloudFile,
    emailEntry,
    emailAccountEntry,
  ],
  middleware: [corsMiddleware, authMiddleware, inLiveMiddleware],
  pathHandlers: [apiPathHandler, staticFilesHandler],
  requestLifecycle: {
    setup: [authLifecycle],
  },
  afterGlobalMigrate: {
    name: "initAdminAccount",
    description: "Check for the existence of a system user",
    async action({ inCloud, orm }) {
      await initAdminAccount(inCloud, orm);
    },
  },
  roles: [{
    roleName: "accountOwner",
    label: "Account Owner",
    description: "The default role assigned to a user",
    entryTypes: {
      cloudFile: {
        view: false,
        modify: false,
        create: false,
        delete: false,
      },
      globalCloudFile: {
        view: true,
        modify: false,
        create: false,
        delete: false,
      },
      user: {
        view: true,
        modify: false,
        create: false,
        delete: false,
        userScoped: {
          userIdField: "id",
        },
        fields: {
          systemAdmin: {
            view: false,
            modify: false,
          },
          firstName: {
            modify: true,
            view: true,
          },
          lastName: {
            modify: true,
            view: true,
          },
        },
        actions: {
          include: [],
        },
      },
    },
  }],
  exceptionHandlers: [{
    name: "orm",
    handler(error) {
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
  config: {
    cloudMode: {
      description:
        "Specify if the server is running in development or production mode",
      required: false,
      type: "string",
      default: "development",
      enum: ["development", "production"],
    },
    logLevel: {
      description: "The log level for the server",
      required: false,
      default: "info",
      type: "string",
      enum: ["debug", "info", "warn", "error"],
      env: "LOG_LEVEL",
    },
    logTrace: {
      description:
        "Whether to include the file and line number in the log output for info, warning and debug logs",
      required: false,
      type: "boolean",
      env: "LOG_TRACE",
    },
    brokerPort: {
      description: "The port the message broker is listening on",
      type: "number",
      default: 11254,
      required: false,
    },
    queuePort: {
      description: "The port the task queue service is listening on",
      type: "number",
      default: 11354,
      required: false,
    },
    hostName: {
      description: "The hostname for the server",
      required: false,
      default: "localhost",
      type: "string",
      env: "SERVE_HOSTNAME",
    },
    publicRoot: {
      description:
        "The root directory for the public static files. This is used to serve static files like images, CSS, and JavaScript.",
      required: false,
      default: "./public",
      type: "string",
    },
    singlePageApp: {
      description:
        "Whether the static files are being served as a SPA. This will default any path that's not a file to the root index.html",
      type: "boolean",
      required: false,
      default: false,
    },
    cacheStatic: {
      description:
        "Whether to cache static files in memory for faster access. This is recommended for production environments.",
      required: false,
      type: "boolean",
      default: false,
    },
    port: {
      description: "The port for the server",
      required: false,
      default: 8000,
      type: "number",
      env: "SERVE_PORT",
    },
    autoConfig: {
      description:
        "Whether to automatically generate the serve config schema when the server starts in development mode",
      required: false,
      type: "boolean",
      env: "SERVE_AUTO_CONFIG",
    },
    allowedOrigins: {
      description: "Allowed CORS Origins",
      required: false,
      default: ["*"],
      type: "string[]",
    },
    autoTypes: {
      description:
        "Automatically generate the ORM interfaces and types when the server starts and `CLOUD_MODE` is set to `development`",
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
    authAllowAll: {
      type: "boolean",
      description:
        "Disable authentication. !NOTE! This should only be used for development purposes!",
      required: false,
    },
  },
});
