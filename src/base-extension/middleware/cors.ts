import type { Middleware } from "~/app/middleware.ts";

export const corsMiddleware: Middleware = {
  name: "CORS Middleware",
  description: "CORS Middleware for InSpatialServer",
  handler(app, inRequest, inResponse) {
    const origins = app.getExtensionConfigValue(
      "cloud",
      "allowedOrigins",
    );

    if (origins?.has(inRequest.origin) || origins?.has("*")) {
      inResponse.setAllowOrigin(inRequest.origin);
    }
  },
};
