import type { CloudAPIDocs, CloudAPIGroupDocs } from "#/api/api-types.ts";

import { raiseServerException } from "#/app/server-exception.ts";
import type { InField } from "#/orm/field/field-def-types.ts";
import { CloudAPIAction } from "#/api/cloud-action.ts";
import { CloudAPIGroup } from "#/api/cloud-group.ts";

/**
 * CloudAPI is a class that provides the main interface for InSpatial Cloud
 */
export class CloudAPI {
  /**
   * A map of action groups.
   */
  actionGroups: Map<string, CloudAPIGroup>;

  #docs: CloudAPIDocs | null = null;

  /**
   * Get a JSON object representing the API groups and actions.
   */
  get docs(): CloudAPIDocs {
    if (this.#docs) return this.#docs;

    const docs: CloudAPIDocs = {
      groups: [],
    };

    this.actionGroups.forEach((group, groupName) => {
      const groupDocs: CloudAPIGroupDocs = {
        groupName,
        description: group.description,
        label: group.label,
        actions: [],
      };

      group.actions.forEach((action, actionName) => {
        groupDocs.actions.push({
          actionName,
          description: action.description,
          label: action.label,
          params: Array.from(action.params.values()) as Array<InField>,
        });
      });
      docs.groups.push(groupDocs);
    });
    this.#docs = docs;
    return docs;
  }

  /**
   * Get information about a group.
   * @param group {string}
   * @returns {CloudAPIGroup | undefined}
   */
  getGroup(group: string | undefined): CloudAPIGroup {
    if (!group) {
      raiseServerException(400, "Group name is required");
    }

    const actionGroup = this.actionGroups.get(group);
    if (!actionGroup) {
      raiseServerException(404, `Group not found: ${group}`);
    }
    return this.actionGroups.get(group) as CloudAPIGroup;
  }

  /**
   * Get information about an action.
   * @param group {string}
   * @param action {string}
   * @returns {CloudAPIAction | undefined}
   */
  getAction(
    group: string | undefined,
    action: string | undefined,
  ): CloudAPIAction {
    if (!group || !action) {
      raiseServerException(400, "Group and action names are required");
    }
    const actionGroup = this.getGroup(group);

    const actionHandler = actionGroup.actions.get(action);
    if (!actionHandler) {
      raiseServerException(
        404,
        `Action not found for Group: '${group}', Action: '${action}'`,
      );
    }
    return actionHandler;
  }
  constructor() {
    this.actionGroups = new Map<string, CloudAPIGroup>();
    this.#setupDefaultGroups();
  }

  #setupDefaultGroups() {
    const getDocsAction = new CloudAPIAction("getDocs", {
      label: "Get Docs",
      description: "Get API documentation",
      params: [],
      run({ app }) {
        return app.api.docs;
      },
    });
    const pingAction = new CloudAPIAction("ping", {
      label: "Ping",
      description: "Ping the server",
      authRequired: false,
      params: [],
      run({ app }) {
        return {
          message: "pong",
          timestamp: Date.now(),
          app: app.appName,
        };
      },
    });
    const apiGroup = new CloudAPIGroup("api", {
      label: "Cloud API",
      description: "Actions related to the Cloud API",
      actions: [pingAction, getDocsAction],
    });
    this.addGroup(apiGroup);
  }

  /**
   * Add a group to the API. The group name must be unique.
   * @param group {ActionsAPIGroup}
   * @returns {void}
   */
  addGroup(group: CloudAPIGroup): void {
    if (this.actionGroups.has(group.groupName)) {
      throw new Error(`Group with name ${group.groupName} already exists`);
    }
    this.actionGroups.set(group.groupName, group);
  }

  /**
   * Add an action to a group. The action name must be unique within the group.
   * @param group
   * @param {ActionsAPIAction} action
   */
  addAction(group: string, action: CloudAPIAction): void {
    const actionGroup = this.getGroup(group);
    if (!actionGroup) return;
    actionGroup.actions.set(action.actionName, action);
  }
}
