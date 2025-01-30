import type { RealtimeHandler } from "#realtime/realtime-handler.ts";
import { createServerMiddleware } from "#/extension/server-middleware.ts";
import type { ServerMiddleware } from "#/extension/server-middleware.ts";

/**
 * The Middleware for the {@link realtimeExtension} that's installed in the {@link InSpatialServer} instance.
 */
export const realtimeMiddleware: ServerMiddleware = createServerMiddleware({
  name: "Realtime Middleware",
  description: "Realtime Middleware for InSpatialServer",
  handler(server, inRequest) {
    if (inRequest.upgradeSocket && inRequest.path === "/ws") {
      const realtime = server.getCustomProperty<RealtimeHandler>("realtime");
      return realtime?.handleUpgrade(inRequest);
    }
  },
});
