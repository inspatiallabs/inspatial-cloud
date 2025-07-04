import type { HandlerResponse, PathHandler } from "~/app/path-handler.ts";
import { raiseServerException, Redirect } from "~/app/server-exception.ts";

export const apiPathHandler: PathHandler = {
  name: "api",
  description: "api",
  match: /^\/api/,
  handler: async (inCloud, inRequest, inResponse) => {
    const { api } = inCloud;
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
    const result = await action.run({
      inCloud,
      inRequest,
      inResponse,
      params: data,
    });
    if (result instanceof Redirect) {
      return inResponse.redirect(result.url);
    }
    return result;
  },
};
