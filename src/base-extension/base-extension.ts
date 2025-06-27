import { CloudExtension } from "~/app/cloud-extension.ts";
import { corsMiddleware } from "~/base-extension/middleware/cors.ts";

import { inLiveMiddleware } from "~/base-extension/middleware/inLive.ts";
import { apiPathHandeler } from "~/api/api-handler.ts";
import { systemSettings } from "~/base-extension/settings-types/systemSettings.ts";
import { cloudActions } from "./actions/dev-actions.ts";
import { inTask } from "~/in-queue/entry-types/in-task/in-task.ts";

export const baseExtension = new CloudExtension("cloud", {
  description: "InSpatial Cloud Core Extension",
  install(app) {
    Deno.mkdirSync(app.filesPath, { recursive: true });
  },
  label: "Core",
  version: "0.0.1",
  config: {
    mode: {
      description:
        "Specify if the server is running in development or production mode",
      required: false,
      type: "string",
      default: "development",
      enum: ["development", "production"],
      env: "SERVE_MODE",
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
      default: "0.0.0.0",
      type: "string",
      env: "SERVE_HOSTNAME",
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
  pathHandlers: [apiPathHandeler],
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
