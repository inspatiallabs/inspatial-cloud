import type { HandlerResponse, PathHandler } from "#/app/path-handler.ts";
import { raiseServerException } from "#/app/server-exception.ts";

export const apiPathHandeler: PathHandler = {
  name: "api",
  description: "api",
  path: "/api",
  handler: async (app, inRequest, inResponse) => {
    const { api } = app;
    const groupParam = inRequest.group;
    const actionParam = inRequest.action;
    if (!groupParam) {
      return api.docs as HandlerResponse;
    }
    const action = api.getAction(groupParam, actionParam);

    if (!action) {
      raiseServerException(
        404,
        `Action not found for Group: '${groupParam}', Action: '${actionParam}'`,
      );
    }
    let data: any = {};
    switch (action.raw) {
      case true:
        data = Object.fromEntries(inRequest.params);
        break;
      default:
        data = await inRequest.body;
    }
    return await action.run({
      app,
      inRequest,
      inResponse,
      params: data,
    });
  },
};
