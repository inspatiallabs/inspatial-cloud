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
import { apiSetup } from "#actions-api/request-lifecycle.ts";

export { ActionsAPI } from "#actions-api/actions-api.ts";
export type {
  ActionParamProp,
  ActionsAPIAction,
  ActionsAPIActionDocs,
  ActionsAPIDocs,
  ActionsAPIGroup,
  ActionsAPIGroupDocs,
  DocsActionParam,
  OptionalParams,
  ParamsMap,
  ParamTypeMap,
  ParamTypeProp,
  RequiredParams,
} from "#actions-api/types.ts";

/**
 * API Extension for {@link InSpatialServer}
 */
const actionsAPI = new ServerExtension("actions-api", {
  description: "API handler for InSpatialServer",
  requestLifecycle: {
    setup: [apiSetup],
  },
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
      params: [],
      handler: () => {
        return api.docs;
      },
    });

    api.addAction("api", {
      actionName: "ping",
      description: "Ping the server",
      params: [],
      handler: () => {
        return {
          message: "pong",
          timestamp: Date.now(),
        };
      },
    });

    return api;
  },
});

/**
 * API Extension for {@link InSpatialServer}
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
export default actionsAPI as ServerExtension<"actions-api", ActionsAPI>;
