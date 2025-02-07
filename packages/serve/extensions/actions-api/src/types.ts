import type { HandlerResponse } from "#/extension/path-handler.ts";
import type { InResponse } from "#/in-response.ts";
import type { InRequest } from "#/in-request.ts";
import type { InSpatialServer } from "#/inspatial-server.ts";

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
  description: string;
  type: ParamTypeProp;
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
  params: Array<ActionParamProp>;
  handler: (
    data: Record<string, unknown>,
    server: InSpatialServer,
    inRequest: InRequest,
    inResponse: InResponse,
  ) => Promise<HandlerResponse> | HandlerResponse;
}

export type ParamTypeProp =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array";

export type ParamTypeMap = {
  string: string;
  number: number;
  boolean: boolean;
  object: Record<string, unknown>;
  array: any[];
};

type ExtractParamType<T> = T extends ActionParamProp<infer K>
  ? T["required"] extends true ? ParamTypeMap[T["type"]]
  : ParamTypeMap[T["type"]] | undefined
  : never;
export type ActionParamProp<K extends PropertyKey = PropertyKey> = {
  key: K;
  required?: boolean;
  type: ParamTypeProp;
  label?: string;
  description?: string;
};

// export type ParamsMap<T> = T extends [] ? undefined
//   : T extends Array<ActionParamProp<infer K>> ? {
//       [K in T[number] as K["key"]]: K["required"] extends true
//         ? ParamTypeMap[K["type"]]
//         : ParamTypeMap[K["type"]] | undefined;
//     }
//   : never;

export type ParamsMap<T> = RequiredParams<T> & OptionalParams<T>;

type RequiredParams<T> = T extends Array<ActionParamProp<infer K>> ? {
    [K in T[number] as K["required"] extends true ? K["key"] : never]:
      ParamTypeMap[K["type"]];
  }
  : never;

type OptionalParams<T> = T extends Array<ActionParamProp<infer K>> ? {
    [K in T[number] as K["required"] extends true ? never : K["key"]]?:
      | ParamTypeMap[K["type"]]
      | undefined;
  }
  : never;
