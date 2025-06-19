import type { ConfigDefinition } from "#types/serve-types.ts";

export const cloudConfig: ConfigDefinition = {
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
};
