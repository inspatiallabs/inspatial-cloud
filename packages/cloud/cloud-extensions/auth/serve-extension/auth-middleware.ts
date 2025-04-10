import type { ServerMiddleware } from "@inspatial/serve";
import type { AuthHandler } from "#extension/auth/auth-handler.ts";
import cloudLogger from "#/cloud-logger.ts";

export const authMiddleware: ServerMiddleware = {
  name: "auth",
  description: "Auth middleware",
  async handler(server, inRequest, inResponse) {
    if (inRequest.method === "OPTIONS") {
      return;
    }
    const sessionId = inRequest.context.get("userSession");
    const authHandler = server.getCustomProperty<AuthHandler>("auth");

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
