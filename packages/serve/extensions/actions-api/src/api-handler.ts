import type { HandlerResponse, PathHandler } from "#/extension/path-handler.ts";
import { raiseServerException } from "#/server-exception.ts";
import type { ActionsAPI } from "#actions-api/actions-api.ts";
import { log } from "#log";

export const apiHandler: PathHandler = {
  name: "api",
  description: "api",
  path: "/api",
  handler: async (server, inRequest, inResponse) => {
    const data = await inRequest.body;
    log.debug(data, "API Handler Data");
    const api = server.getExtension("actions-api") as ActionsAPI;
    if (!inRequest.group) {
      return api.docs as HandlerResponse;
    }
    const group = api.getGroup(inRequest.group);
    if (!group) {
      raiseServerException(404, `Group not found: ${inRequest.group}`);
    }
    if (!inRequest.action) {
      const groupDocs = api.docs.groups.find((g) =>
        g.groupName === inRequest.group
      );
      if (!groupDocs) {
        raiseServerException(404, `Group not found: ${inRequest.group}`);
      }
      return groupDocs as Record<string, any>;
    }
    const action = api.getAction(inRequest.group, inRequest.action);

    if (!action) {
      raiseServerException(
        404,
        `Action not found for Group: '${inRequest.group}', Action: '${inRequest.action}'`,
      );
    }
    return await action.handler(data, server, inRequest, inResponse);
  },
};
