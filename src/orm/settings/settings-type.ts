import { BaseType } from "/orm/shared/base-type-class.ts";
import type {
  SettingsActionDefinition,
  SettingsHookDefinition,
  SettingsTypeConfig,
} from "/orm/settings/types.ts";
import type { HookName } from "/orm/orm-types.ts";
import type { GenericSettings } from "/orm/settings/settings-base.ts";
import { raiseORMException } from "/orm/orm-exception.ts";
import type { BaseConfig } from "/orm/shared/shared-types.ts";

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
  constructor(
    name: N,
    config: BaseConfig & {
      actions?: Array<SettingsActionDefinition<S>>;
      hooks?: Partial<Record<HookName, Array<SettingsHookDefinition<S>>>>;
    },
  ) {
    super(name, config);

    this.config = {
      description: this.description,
      label: this.label,
    };
    this.#setChildrenParent();
    this.#setupActions(config.actions);
    this.#setupHooks(config.hooks);
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
}
