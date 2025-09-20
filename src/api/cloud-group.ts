import {
  type ActionConfigBase,
  type ActionMethod,
  CloudAPIAction,
} from "~/api/cloud-action.ts";
import { raiseServerException } from "~/serve/server-exception.ts";
import convertString from "../utils/convert-string.ts";
import type { InField } from "../orm/field/field-def-types.ts";

export class CloudAPIGroup<
  G extends string = string,
> {
  groupName: G;
  description: string;
  label?: string;
  actions: Map<string, CloudAPIAction>;

  constructor(groupName: G, config: {
    description: string;
    label?: string;
    actions?: Array<CloudAPIAction>;
  }) {
    this.groupName = groupName;
    this.description = config.description;
    this.label = config.label;
    this.actions = new Map();
    config.actions?.forEach((action) => this.#addAction(action));
  }
  #addAction(action: CloudAPIAction) {
    if (this.actions.has(action.actionName)) {
      raiseServerException(
        400,
        `Action name ${action.actionName} is already a registered action!`,
      );
    }
    action.groupName = this.groupName;
    this.actions.set(action.actionName, action);
  }
  /** Add a new action to the group
   *
   * @param actionName The name of the action
   * @param config The configuration for the action
   */
  addAction<
    K extends string,
    AP extends Array<InField & { key: K }> | undefined,
  >(
    actionName: string,
    config: ActionConfigBase & {
      params?: AP extends undefined ? never : AP;
      action: ActionMethod<AP>;
    },
  ): void {
    const action = new CloudAPIAction(actionName, config);
    this.#addAction(action);
  }
}

/** Define a new API group
 *
 * @param groupName The name of the group
 * @param config The configuration for the group
 * @returns The defined API group
 */
export function defineAPIGroup<G extends string>(groupName: G, config?: {
  description?: string;
  label?: string;
  actions?: Array<CloudAPIAction<any, any>>;
}): CloudAPIGroup<G> {
  const group = new CloudAPIGroup(groupName, {
    description: config?.description || "",
    label: config?.label || convertString(groupName, "title", true),
    actions: config?.actions,
  });
  return group;
}
