/**
 * Realtime Extension for {@link InSpatialServer}
 *
 * @module realtimeExtension
 * @example
 * ```ts
 * import { InSpatialServer } from "@inspatial/serve";
 * import realtimeExtension from "@inspatial/serve/realtime";
 *
 * const server = await InSpatialServer.create({
 *  extensions: [realtimeExtension],
 * });
 *
 * server.run();
 * ```
 */

import { RealtimeHandler } from "#realtime/realtime-handler.ts";
import { realtimeMiddleware } from "#realtime/realtime-middleware.ts";
import { ServerExtension } from "#/extension/server-extension.ts";
export { RealtimeClient, type SocketStatus } from "./client/realtime-client.ts";
export type {
  RealtimeBroadcastMessage,
  RealtimeClientMessage,
  RealtimeMessage,
  RealtimeRoomDef,
  RealtimeUser,
} from "#realtime/types.ts";

/**
 * Realtime Extension for {@link InSpatialServer}
 */
const realtimeExtension = new ServerExtension("realtime", {
  description: "Realtime Handler for InSpatialServer",
  middleware: [realtimeMiddleware],
  install: (_server) => {
    const realtime = new RealtimeHandler();
    return realtime;
  },
});
export type { RealtimeHandler };

/**
 * Realtime Extension for {@link InSpatialServer}
 *
 * @example
 * ```ts
 * import { InSpatialServer } from "@inspatial/serve";
 * import realtimeExtension from "@inspatial/serve/realtime";
 *
 * const server = await InSpatialServer.create({
 *  extensions: [realtimeExtension],
 * });
 *
 * server.run();
 * ```
 */
export default realtimeExtension as ServerExtension<
  "realtime",
  RealtimeHandler
>;
