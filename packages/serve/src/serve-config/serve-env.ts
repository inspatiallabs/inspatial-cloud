import { ConfigDefinition } from "#/types.ts";

export const serveEnvConfig: ConfigDefinition = {
  logLevel: {
    description: "The log level for the server",
    required: false,
    default: "info",
    type: "string",
    env: "LOG_LEVEL",
  },
};
