import type { LifecycleHandler } from "#/extension/request-lifecycle.ts";

export const apiSetup: LifecycleHandler = {
  name: "parseApiParams",
  description: "Parse 'group' and 'action' params",
  handler(inRequest) {
    const group = inRequest.params.get("group");
    const action = inRequest.params.get("action");

    // Register the 'group' and 'action' params as context variables
    inRequest.context.register("apiGroup", group);
    inRequest.context.register("apiAction", action);

    // Delete the 'group' and 'action' params from the request
    // so that they are not merged into the request body
    inRequest.params.delete("group");
    inRequest.params.delete("action");
  },
};
