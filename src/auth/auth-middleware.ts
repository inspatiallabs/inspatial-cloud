import type { Middleware } from "~/serve/middleware.ts";
export const authMiddleware: Middleware = {
  name: "auth",
  description: "Auth middleware",
  async handler(inCloud, inRequest, inResponse) {
    if (inRequest.method === "OPTIONS") {
      return;
    }

    const sessionId = inRequest.context.get("userSession");

    const authHandler = inCloud.auth;

    let sessionData = await authHandler.loadUserSession(sessionId);
    if (!sessionData) {
      const authToken = inRequest.context.get("authToken");
      sessionData = await authHandler.loadSessionFromToken(authToken);
    }
    if (sessionData) {
      inRequest.context.update("user", sessionData);
      return;
    }

    let isAllowed = false;
    isAllowed = inCloud.getExtensionConfigValue("core", "authAllowAll");
    if (isAllowed) {
      return;
    }
    const path = inRequest.path;
    isAllowed = authHandler.isPathAllowed(path);

    const group = inRequest.context.get("apiGroup");
    const action = inRequest.context.get("apiAction");

    if (group && action) {
      isAllowed = authHandler.isActionAllowed(group, action);
    }

    if (!isAllowed) {
      inResponse.setErrorStatus(403, "Forbidden");
      return inResponse.error();
    }
  },
};
