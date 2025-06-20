import type { LifecycleHandler } from "/app/request-lifecycle.ts";

export const authLifecycle: LifecycleHandler = {
  name: "parseAuth",
  handler(inRequest) {
    if (inRequest.method === "OPTIONS") {
      return;
    }
    inRequest.context.register("user", null);
    inRequest.context.register("authToken", null);
    inRequest.context.register("userSession", null);
    const authHeader = inRequest.headers.get("Authorization");
    if (authHeader) {
      const parts = authHeader.split(" ");
      if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
        inRequest.context.update("authToken", parts[1]);
      }
    }
    const userSessionId = inRequest.cookies.get("userSession");
    if (userSessionId) {
      inRequest.context.update("userSession", userSessionId);
    }
  },
};
