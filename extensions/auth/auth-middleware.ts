import type { ServerMiddleware } from "#/app/server-middleware.ts";
import type { AuthHandler } from "#extensions/auth/auth-handler.ts";

export const authMiddleware: ServerMiddleware = {
  name: "auth",
  description: "Auth middleware",
  async handler(app, inRequest, inResponse) {
    if (inRequest.method === "OPTIONS") {
      return;
    }
    const sessionId = inRequest.context.get("userSession");

    const authHandler = app.getCustomProperty<AuthHandler>("auth");

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
    isAllowed = server.getExtensionConfigValue("auth", "allowAll");
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
