import {
  type ActionConfig,
  type ActionMethod,
  CloudAPIAction,
} from "#/api/cloud-action.ts";
import type { CloudParam } from "#/api/api-types.ts";
import { raiseServerException } from "#/app/server-exception.ts";

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
    config.actions?.forEach((action) => this.addAction(action));
  }
  #addAction(action: CloudAPIAction) {
    if (this.actions.has(action.actionName)) {
      raiseServerException(
        400,
        `Action name ${action.actionName} is already a registered action!`,
      );
    }
    this.actions.set(action.actionName, action);
  }
  addAction<
    K extends PropertyKey = PropertyKey,
    P extends Array<CloudParam<K>> = Array<CloudParam<K>>,
    R extends ActionMethod<K, P> = ActionMethod<K, P>,
  >(name: string, config: ActionConfig<K, P, R>): void;
  addAction(action: CloudAPIAction): void;
  addAction(
    nameOrAction: string | CloudAPIAction,
    actionConfig?: ActionConfig,
  ): void {
    if (nameOrAction instanceof CloudAPIAction) {
      this.#addAction(nameOrAction);
      return;
    }
    if (typeof nameOrAction !== "string") {
      raiseServerException(400, "action name must be a string");
    }
    if (actionConfig === undefined) {
      raiseServerException(
        400,
        `Please provide config options for ${nameOrAction} action`,
      );
    }

    const action = new CloudAPIAction(nameOrAction, actionConfig);
    this.#addAction(action);
  }
}
