import type { InSpatialCloud } from "#/inspatial-cloud.ts";
import type { InRequest } from "#/app/in-request.ts";
import type { InResponse } from "#/app/in-response.ts";
import type { HandlerResponse } from "#/app/path-handler.ts";

/**
 * The full documentation for an ActionsAPI instance in JSON format.
 */
export interface CloudAPIDocs extends Record<string, unknown> {
  /**
   * An array of groups in the API.
   * Each group contains an array of actions.
   */
  groups: CloudAPIGroupDocs[];
}

/**
 * The documentation for an ActionsAPI group in JSON format.
 */
export interface CloudAPIGroupDocs {
  /**
   * The name of the group.
   */
  groupName: string;

  /**
   * A description of the group.
   */
  description: string;
  /**
   * An array of actions in the group.
   */

  /**
   * A label for the group to display in the UI.
   */
  label?: string;
  actions: CloudAPIActionDocs[];
}

/**
 * A single action parameter configuration in JSON format.
 */
export interface DocsActionParam {
  /**
   * The name of the parameter.
   */
  paramName: string;
  /**
   * Whether the parameter is required.
   */
  required: boolean;
  /**
   * A description of the parameter.
   */
  description: string;

  /**
   * The type of the parameter
   */
  type: ParamTypeProp;
}

/**
 * The documentation for an ActionsAPI action in JSON format.
 */
export interface CloudAPIActionDocs {
  /**
   * The name of the action.
   */
  actionName: string;
  /**
   * A description of the action.
   */
  description: string;
  /**
   * An array of parameters for the action.
   */

  /**
   * A label for the action to display in the UI.
   */
  label?: string;
  params?: Array<DocsActionParam>;
}

/**
 * The type of a parameter for an action.
 */
export type ParamTypeProp =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array";

/**
 * A map of parameter types to their JavaScript types.
 */
export type ParamTypeMap = {
  string: string;
  number: number;
  boolean: boolean;
  object: Record<string, unknown>;
  array: any[];
};

/**
 * A single parameter configuration for an action.
 */
export type ActionParamProp<K extends PropertyKey = PropertyKey> = {
  /**
   * The key for the parameter.
   */
  key: K;
  /**
   * Whether the parameter is required.
   */
  required?: boolean;
  /**
   * The type of the parameter.
   */
  type: ParamTypeProp;
  /**
   * A label for the parameter.
   */
  label?: string;
  /**
   * A description of the parameter
   */
  description?: string;
};

/**
 * A typed map of parameters passed to an action handler.
 */
export type ParamsMap<T> = RequiredParams<T> & OptionalParams<T>;

/**
 * A typed map of required parameters passed to an action handler.
 */

export type RequiredParams<T> = T extends Array<ActionParamProp<infer K>> ? {
    [K in T[number] as K["required"] extends true ? K["key"] : never]:
      ParamTypeMap[K["type"]];
  }
  : never;

/**
 * A typed map of optional parameters passed to an action handler.
 */
export type OptionalParams<T> = T extends Array<ActionParamProp<infer K>> ? {
    [K in T[number] as K["required"] extends true ? never : K["key"]]?:
      | ParamTypeMap[K["type"]]
      | undefined;
  }
  : never;
