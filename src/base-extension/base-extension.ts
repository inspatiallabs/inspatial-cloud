import { CloudExtension } from "~/app/cloud-extension.ts";
import { corsMiddleware } from "~/base-extension/middleware/cors.ts";

import { inLiveMiddleware } from "~/base-extension/middleware/inLive.ts";
import { apiPathHandler } from "~/api/api-handler.ts";
import { systemSettings } from "~/base-extension/settings-types/systemSettings.ts";
import { cloudActions } from "./actions/dev-actions.ts";
import { inTask } from "~/in-queue/entry-types/in-task/in-task.ts";
import { staticFilesHandler } from "../static/staticPathHandler.ts";
import { normalizePath } from "../utils/path-utils.ts";
import { raiseCloudException } from "../app/exeption/cloud-exception.ts";

export const baseExtension = new CloudExtension("cloud", {
  description: "InSpatial Cloud Core Extension",
  async install(app, config) {
    Deno.mkdirSync(app.filesPath, { recursive: true });
    try {
      const path = Deno.realPathSync(config.publicRoot);
      app.static.staticFilesRoot = normalizePath(path);
    } catch (e) {
      if (e instanceof Deno.errors.NotFound) {
        if (config.publicRoot === "./public") {
          Deno.mkdirSync(config.publicRoot, { recursive: true });
          app.static.staticFilesRoot = normalizePath(
            Deno.realPathSync(config.publicRoot),
          );
          return;
        }
        raiseCloudException(
          `Public root directory not found: ${config.publicRoot}`,
        );
      }
      throw e;
    }
    app.static.spa = config.singlePageApp;
    app.static.setCach(config.cacheStatic);

    await app.static.init(
      app.static.staticFilesRoot.replace(app.cloudRoot, "."),
    );
  },
  label: "Core",
  version: "0.0.1",
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
  },
  actionGroups: [cloudActions],
  settingsTypes: [systemSettings],
  entryTypes: [inTask],
  middleware: [corsMiddleware, inLiveMiddleware],
  pathHandlers: [apiPathHandler, staticFilesHandler],
  roles: [{
    roleName: "basic",
    label: "Basic User",
    description: "The default limited role assigned to new users",
    entryTypes: {
      cloudFile: {
        view: false,
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
});
