import { BaseType } from "~/orm/shared/base-type-class.ts";
import type {
  SettingsActionDefinition,
  SettingsConfig,
  SettingsHookDefinition,
  SettingsTypeConfig,
} from "~/orm/settings/types.ts";
import type { HookName } from "~/orm/orm-types.ts";
import type { GenericSettings } from "~/orm/settings/settings-base.ts";
import { raiseORMException } from "~/orm/orm-exception.ts";
import type {
  SettingsPermission,
  SettingsRole,
} from "../roles/settings-permissions.ts";

/**
 * Defines a settings type for the ORM.
 */
export class SettingsType<
  S extends GenericSettings = GenericSettings,
  N extends string = string,
> extends BaseType<N> {
  /**
   * Defines a settings type for the ORM.
   * @param name The name of the settings type.
   * @param fields The fields of the settings type.
   */
  config: SettingsTypeConfig;

  actions: Map<string, SettingsActionDefinition<S>> = new Map();
  hooks: Record<HookName, Array<SettingsHookDefinition<S>>> = {
    beforeValidate: [],
    validate: [],
    beforeUpdate: [],
    afterUpdate: [],
  };
  roles: Map<string, SettingsRole> = new Map();
  sourceConfig: SettingsConfig<S>;
  permission: SettingsPermission;
  constructor(
    name: N,
    config: SettingsConfig<S>,
  ) {
    super(name, config);

    this.sourceConfig = {
      ...config,
    };
    this.permission = {
      view: true,
      modify: true,
    };
    this.config = {
      description: this.description,
      label: this.label,
    };
    this.#setChildrenParent();
    this.#setupActions(config.actions);
    this.#setupHooks(config.hooks);
    this.#setupRoles(config.roles);
    this.info = {
      config: this.config,
      actions: Array.from(this.actions.values()).filter((action) =>
        !action.private
      ),
    };
  }
  #setChildrenParent() {
    if (!this.children) {
      return;
    }
    for (const child of this.children.values()) {
      child.setParentEntryType(this.name, true);
    }
  }
  #setupActions(actions?: Array<SettingsActionDefinition<S>>): void {
    if (!actions) {
      return;
    }
    for (const action of actions) {
      if (this.actions.has(action.key)) {
        raiseORMException(
          `Action with key ${action.key} already exists in SettingsType ${this.name}`,
        );
      }

      this.actions.set(action.key, action);
    }
  }

  #setupHooks(
    hooks?: Partial<Record<HookName, Array<SettingsHookDefinition<S>>>>,
  ): void {
    if (!hooks) {
      return;
    }
    this.hooks = {
      ...this.hooks,
      ...hooks,
    };
  }
  #setupRoles(roles?: Array<SettingsRole>) {
    this.roles.set("systemAdmin", {
      roleName: "systemAdmin",
      permission: {
        view: true,
        modify: true,
      },
    });
    if (!roles) return;
    for (const role of roles) {
      const { roleName } = role;
      if (this.roles.has(roleName)) {
        raiseORMException(
          `Role ${roleName} is already set for Entry Type ${this.name}`,
        );
      }
      this.roles.set(roleName, role);
    }
  }
}
