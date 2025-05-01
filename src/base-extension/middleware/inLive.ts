import type { Middleware } from "#/app/middleware.ts";

export const inLiveMiddleware: Middleware = {
  name: "Realtime Middleware",
  description: "Realtime Middleware for InSpatialServer",
  handler(app, inRequest) {
    if (inRequest.upgradeSocket && inRequest.path === "/ws") {
      return app.inLive.handleUpgrade(inRequest);
    }
  },
};
