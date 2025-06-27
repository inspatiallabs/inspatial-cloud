import type { InField } from "~/orm/field/field-def-types.ts";
import type { InValue } from "~/orm/field/types.ts";

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
  params?: Array<InField>;
}

/**
 * A typed map of parameters passed to an action handler.
 */
export type CloudParam<P extends PropertyKey> = Omit<InField, "key"> & {
  key: P;
};
/**
 * A typed map of required parameters passed to an action handler.
 */

export type ExtractParams<
  K extends PropertyKey,
  P extends Array<CloudParam<K>>,
> =
  & {
    [S in P[number] as S["required"] extends true ? S["key"] : never]: InValue<
      S["type"]
    >;
  }
  & {
    [S in P[number] as S["required"] extends true ? never : S["key"]]?: InValue<
      S["type"]
    >;
  };
