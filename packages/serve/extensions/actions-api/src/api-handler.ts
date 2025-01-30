import type { PathHandler } from "#/extension/path-handler.ts";
import { raiseServerException } from "#/server-exception.ts";

export const apiHandler: PathHandler = {
  name: "api",
  description: "api",
  path: "/api",
  handler: async (server, inRequest, inResponse) => {
    await inRequest.loadBody();
    const data = inRequest.body;
    const api = server.getExtension("actions-api");
    console.log(api);
    const action = api?.getAction(inRequest.group, inRequest.action);
    if (!action) {
      raiseServerException(
        404,
        `Action not found: ${inRequest.group}/${inRequest.action}`,
      );
    }
    console.log(Object.fromEntries(data));
    return await action.handler(data, server, inRequest, inResponse);
  },
};
