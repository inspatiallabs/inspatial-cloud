import type { HandlerResponse } from "#/extension/path-handler.ts";
import type { InResponse } from "#/in-response.ts";
import type { InRequest } from "#/in-request.ts";
import type { InSpatialServer } from "#/inspatial-server.ts";
import type { EasyFieldType } from "@vef/types";

/**
 * The full documentation for an ActionsAPI instance in JSON format.
 */
export interface ActionsAPIDocs extends Record<string, unknown> {
  groups: ActionsAPIGroupDocs[];
}

/**
 * The documentation for an ActionsAPI group in JSON format.
 */
export interface ActionsAPIGroupDocs {
  groupName: string;
  description: string;
  actions: ActionsAPIActionDocs[];
}

export interface DocsActionParam {
  paramName: string;
  required: boolean;
  type: EasyFieldType;
}
export interface ActionsAPIActionDocs {
  actionName: string;
  description: string;
  params?: Array<DocsActionParam>;
}
export interface ActionsAPIGroup {
  groupName: string;
  description: string;
  actions: Map<string, ActionsAPIAction>;
}
export interface ActionsAPIAction {
  actionName: string;
  description: string;
  params: Record<string, {
    type: EasyFieldType;
    required?: boolean;
  }>;
  handler: (
    data: Map<string, unknown>,
    server: InSpatialServer,
    inRequest: InRequest,
    inResponse: InResponse,
  ) => Promise<HandlerResponse> | HandlerResponse;
}
