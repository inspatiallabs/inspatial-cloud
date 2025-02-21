import { ConfigDefinition } from "#/types.ts";

export const serveEnvConfig: ConfigDefinition = {
  logLevel: {
    description: "The log level for the server",
    required: false,
    default: "info",
    type: "string",
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
};
