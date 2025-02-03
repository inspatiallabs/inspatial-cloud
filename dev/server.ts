import { InSpatialServer } from "#serve";
import { generateServeConfigFile } from "../packages/serve/src/serve-config/serve-config.ts";

import realtimeExtension from "#realtime";

const server = new InSpatialServer({
  extensions: [realtimeExtension],
});

const realtime = server.getExtension("realtime");

generateServeConfigFile(server);
server.run();
