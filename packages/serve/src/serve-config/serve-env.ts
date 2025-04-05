import type { ConfigDefinition } from "#/types.ts";

export const serveEnvConfig: ConfigDefinition = {
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
    default: false,
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
};
