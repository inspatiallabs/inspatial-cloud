import { CloudExtension } from "#/app/cloud-extension.ts";
import { HandlerResponse } from "#/app/path-handler.ts";
import { raiseServerException } from "#/app/server-exception.ts";

export const baseExtension = new CloudExtension({
  key: "base",
  description: "Base Extension",
  install() {
    // This is where you can add any installation logic for the extension.
  },
  title: "Base Extension",
  version: "0.0.1",
  config: {
    allowedOrigins: {
      description: "Allowed CORS Origins",
      required: false,
      default: ["*"],
      type: "string[]",
    },
  },
  actionGroups: [],
  middleware: [{
    name: "CORS Middleware",
    description: "CORS Middleware for InSpatialServer",
    handler(app, inRequest, inResponse) {
      const origins = app.getExtensionConfigValue<Set<string>>(
        "CORS",
        "allowedOrigins",
      );

      if (origins?.has(inRequest.origin) || origins?.has("*")) {
        inResponse.setAllowOrigin(inRequest.origin);
      }
    },
  }],
  pathHandlers: [{
    name: "api",
    description: "api",
    path: "/api",
    handler: async (app, inRequest, inResponse) => {
      const data = await inRequest.body;
      const { api } = app;
      const groupParam = inRequest.group;
      const actionParam = inRequest.action;
      if (!groupParam) {
        return api.docs as HandlerResponse;
      }
      const group = api.getGroup(groupParam);
      if (!group) {
        raiseServerException(404, `Group not found: ${groupParam}`);
      }
      if (!actionParam) {
        const groupDocs = api.docs.groups.find((g) =>
          g.groupName === groupParam
        );
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

      return await action.handler(data, app, inRequest, inResponse);
    },
  }],
});
