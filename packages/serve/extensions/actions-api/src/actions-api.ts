import type {
  ActionsAPIAction,
  ActionsAPIActionDocs,
  ActionsAPIDocs,
  ActionsAPIGroup,
  ActionsAPIGroupDocs,
} from "#actions-api/types.ts";

/**
 * ActionsAPI is a class that provides the main interface for the ActionsAPI extension for InSpatialServer.
 */
export class ActionsAPI {
  actionGroups: Map<string, ActionsAPIGroup>;

  private _docs: ActionsAPIDocs | null = null;

  /**
   * Get a JSON object representing the API groups and actions.
   */
  get docs(): ActionsAPIDocs {
    if (this._docs) return this._docs;
    const docs: ActionsAPIDocs = {
      groups: [],
    };
    this.actionGroups.forEach((group, groupName) => {
      const groupDocs: ActionsAPIGroupDocs = {
        groupName,
        description: group.description,
        actions: [],
      };
      group.actions.forEach((action, actionName) => {
        let params: ActionsAPIActionDocs["params"] = [];
        if (action.params) {
          params = Object.entries(action.params)?.map(
            ([paramName, param]) => {
              return {
                paramName,
                required: param.required || false,
                type: param.type,
              };
            },
          );
        }
        groupDocs.actions.push({
          actionName,
          description: action.description,
          params,
        });
      });
      docs.groups.push(groupDocs);
    });
    this._docs = docs;
    return docs;
  }

  /**
   * Get information about a group.
   * @param group {string}
   * @returns {ActionsAPIGroup | undefined}
   */
  getGroup(group: string): ActionsAPIGroup | undefined {
    return this.actionGroups.get(group);
  }

  /**
   * Get information about an action.
   * @param group {string}
   * @param action {string}
   * @returns {ActionsAPIAction | undefined}
   */
  getAction(
    group: string | undefined,
    action: string | undefined,
  ): ActionsAPIAction | undefined {
    if (!group) {
      return;
    }
    const actionGroup = this.getGroup(group);
    if (!actionGroup) return;
    if (!action) return;
    return actionGroup.actions.get(action);
  }
  constructor() {
    this.actionGroups = new Map<string, ActionsAPIGroup>();
  }

  private _sanitizeName(name: string) {
    return name.replace(/[^a-z0-9]/gi, "");
  }

  /**
   * Add a group to the API. The group name must be unique.
   * @param group {ActionsAPIGroup}
   * @returns {void}
   */
  addGroup(group: ActionsAPIGroup): void {
    if (this.actionGroups.has(group.groupName)) {
      throw new Error(`Group with name ${group.groupName} already exists`);
    }
    this.actionGroups.set(group.groupName, group);
  }

  /**
   * Add an action to a group. The action name must be unique within the group.
   * @param group {string}
   * @param action {ActionsAPIAction}
   * @returns {void}
   */
  addAction(group: string, action: ActionsAPIAction): void {
    const actionGroup = this.getGroup(group);
    if (!actionGroup) return;
    actionGroup.actions.set(action.actionName, action);
  }
}
