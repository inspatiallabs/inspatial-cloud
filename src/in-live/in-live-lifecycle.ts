import type { LifecycleHandler } from "~/serve/request-lifecycle.ts";

export const inLiveLifecycle: LifecycleHandler = {
  name: "parseAuth",
  handler(inRequest) {
    if (inRequest.method === "OPTIONS") {
      return;
    }
    if (inRequest.path !== "/ws") {
      return;
    }
    if (inRequest.params.has("authToken")) {
      inRequest.context.update("authToken", inRequest.params.get("authToken"));
      inRequest.params.delete("authToken");
    }
  },
};
