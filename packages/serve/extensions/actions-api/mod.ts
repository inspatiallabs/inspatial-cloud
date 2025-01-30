/**
 * API Extension for {@link InSpatialServer}
 * @module actions-api
 * @example
 * ```ts
 * import { InSpatialServer } from "@inspatial/serve";
 * import actionsAPI from "@inspatial/serve/actions-api";
 *
 * const server = await InSpatialServer.create({
 *  extensions: [actionsAPI],
 * });
 *
 * server.run();
 * ```
 */
import { ServerExtension } from "#/extension/server-extension.ts";

import { apiHandler } from "#actions-api/api-handler.ts";
import { ActionsAPI } from "#actions-api/actions-api.ts";

export { ActionsAPI } from "#actions-api/actions-api.ts";
export type {
  ActionsAPIAction,
  ActionsAPIActionDocs,
  ActionsAPIDocs,
  ActionsAPIGroup,
  ActionsAPIGroupDocs,
} from "#actions-api/types.ts";

/**
 * API Extension for {@link InSpatialServer}
 */
const actionsAPI: ServerExtension<
  "actions-api",
  ActionsAPI
> = ServerExtension.create("actions-api", {
  description: "API handler for InSpatialServer",
  pathHandlers: [apiHandler],
  install: (_server) => {
    const api = new ActionsAPI();
    api.addGroup({
      groupName: "api",
      description: "API",
      actions: new Map(),
    });
    api.addAction("api", {
      actionName: "getDocs",
      description: "Get API documentation",
      params: {},
      handler: () => {
        return api.docs;
      },
    });

    return api;
  },
});

export default actionsAPI;
