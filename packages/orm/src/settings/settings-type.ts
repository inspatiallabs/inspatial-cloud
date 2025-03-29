import type { ORMFieldDef } from "#/field/field-def-types.ts";
import { BaseType } from "#/shared/base-type-class.ts";
import type {
  SettingsActionDefinition,
  SettingsHookDefinition,
  SettingsTypeConfig,
  SettingsTypeInfo,
} from "#/settings/types.ts";
import type { HookName } from "#/types.ts";
import type { GenericSettings } from "#/settings/settings-base.ts";
import { raiseORMException } from "#/orm-exception.ts";

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
    config: {
      fields: Array<ORMFieldDef>;
      label?: string;
      description?: string;
      actions?: Array<SettingsActionDefinition<S>>;
      hooks?: Partial<Record<HookName, Array<SettingsHookDefinition<S>>>>;
    },
  ) {
    super(name, config);

    this.config = {
      description: this.description,
      label: this.label,
    };
    this.#setupActions(config.actions);
    this.#setupHooks(config.hooks);
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
  get info(): SettingsTypeInfo {
    return {
      name: this.name,
      label: this.config.label,
      config: this.config,
      fields: Array.from(this.fields.values()),
      titleFields: Array.from(this.connectionTitleFields.values()),
      displayFields: Array.from(this.displayFields.values()),
    };
  }
}
