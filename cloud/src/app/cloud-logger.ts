import { ServeLogger } from "#/logger/serve-logger.ts";

const cloudLogger = new ServeLogger({
  consoleDefaultStyle: "full",
  name: "InSpatial Cloud",
  traceOffset: 1,
});

export default cloudLogger;
