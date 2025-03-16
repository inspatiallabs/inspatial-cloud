import { ServeLogger } from "@inspatial/serve";

const cloudLogger = new ServeLogger({
  consoleDefaultStyle: "full",
  name: "InSpatial Cloud",
  traceOffset: 1,
});

export default cloudLogger;
