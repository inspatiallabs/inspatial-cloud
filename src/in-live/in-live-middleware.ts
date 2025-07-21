import type { Middleware } from "~/serve/middleware.ts";

export const inLiveMiddleware: Middleware = {
  name: "Realtime Middleware",
  description: "Realtime Middleware for InSpatialServer",
  handler(app, inRequest) {
    if (inRequest.path === "/ws") {
      console.log(inRequest.upgradeSocket);
      console.log("socket");
    }
    if (inRequest.upgradeSocket && inRequest.path === "/ws") {
      return app.inLive.handleUpgrade(inRequest);
    }
  },
};
