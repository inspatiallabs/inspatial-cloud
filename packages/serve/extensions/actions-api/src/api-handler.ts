import type { HandlerResponse, PathHandler } from "#/extension/path-handler.ts";
import { raiseServerException } from "#/server-exception.ts";
import type { ActionsAPI } from "#actions-api/actions-api.ts";

export const apiHandler: PathHandler = {
  name: "api",
  description: "api",
  path: "/api",
  handler: async (server, inRequest, inResponse) => {
    const data = await inRequest.body;
    const api = server.getExtension("actions-api") as ActionsAPI;
    const groupParam = inRequest.context.get("apiGroup");
    const actionParam = inRequest.context.get("apiAction");
    if (!groupParam) {
      return api.docs as HandlerResponse;
    }
    const group = api.getGroup(groupParam);
    if (!group) {
      raiseServerException(404, `Group not found: ${groupParam}`);
    }
    if (!actionParam) {
      const groupDocs = api.docs.groups.find((g) => g.groupName === groupParam);
      if (!groupDocs) {
        raiseServerException(404, `Group not found: ${groupParam}`);
      }
      return groupDocs as Record<string, any>;
    }
    const action = api.getAction(groupParam, actionParam);

    if (!action) {
      raiseServerException(
        404,
        `Action not found for Group: '${groupParam}', Action: '${actionParam}'`,
      );
    }
    return await action.handler(data, server, inRequest, inResponse);
  },
};
