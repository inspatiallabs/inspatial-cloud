import { ServeLogger } from "#/logger/serve-logger.ts";

export const ormLogger = new ServeLogger({
  name: "InSpatial ORM",
  consoleDefaultStyle: "full",
  traceOffset: 1,
});
