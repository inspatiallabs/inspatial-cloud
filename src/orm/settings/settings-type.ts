import { BaseType } from "~/orm/shared/base-type-class.ts";
import type {
  SettingsActionDefinition,
  SettingsConfig,
  SettingsHookDefinition,
  SettingsTypeConfig,
} from "~/orm/settings/types.ts";
import type { HookName } from "~/orm/orm-types.ts";
import { raiseORMException } from "~/orm/orm-exception.ts";
import type {
  SettingsPermission,
  SettingsRole,
} from "../roles/settings-permissions.ts";
import { getCallerPath } from "../../utils/path-utils.ts";
import convertString from "../../utils/convert-string.ts";

/**
 * Defines a settings type for the ORM.
 */
export class SettingsType<
  S extends string = string,
> extends BaseType<S> {
  /**
   * Defines a settings type for the ORM.
   * @param name The name of the settings type.
   * @param fields The fields of the settings type.
   */
  config: SettingsTypeConfig;

  actions: Map<string, SettingsActionDefinition<S>> = new Map();
  hooks: Record<HookName, Map<string, SettingsHookDefinition<S>>>;
  roles: Map<string, SettingsRole> = new Map();
  sourceConfig: SettingsConfig<S>;
  permission: SettingsPermission;
  constructor(
    name: S,
    config: SettingsConfig<S>,
    rm?: boolean,
  ) {
    super(name, config);
    this.hooks = {
      beforeUpdate: new Map(),
      afterUpdate: new Map(),
      beforeValidate: new Map(),
      validate: new Map(),
    };
    if (!rm) {
      this.dir = getCallerPath();
    }
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
      setupAction(action);
      this.actions.set(action.key, action);
    }
  }

  #setupHooks(
    hooks?: Partial<Record<HookName, Array<SettingsHookDefinition<S>>>>,
  ): void {
    if (!hooks) {
      return;
    }
    for (
      const [hookName, hookList] of Object.entries(hooks) as Array<
        [HookName, Array<SettingsHookDefinition<S>>]
      >
    ) {
      for (const hook of hookList) {
        this.addHook(hookName, hook);
      }
    }
  }
  addHook(hookName: HookName, hook: SettingsHookDefinition<S>) {
    const hookMap = this.hooks[hookName];
    if (hookMap.has(hook.name)) {
      raiseORMException(
        `Hook with name ${hook.name} already exists in SettingsType ${this.name} for ${hookName}`,
      );
    }
    hookMap.set(hook.name, hook);
  }
  addAction(action: SettingsActionDefinition<S>) {
    if (this.actions.has(action.key)) {
      raiseORMException(
        `Action with key ${action.key} already exists in SettingsType ${this.name}`,
      );
    }
    setupAction(action);
    this.actions.set(action.key, action);
    this.info = {
      ...this.info,
      actions: Array.from(this.actions.values()).filter((a) => !a.private),
    };
  }
}

function setupAction(action: SettingsActionDefinition<any>): void {
  if (!action.label) {
    action.label = convertString(action.key, "title", true);
  }
  for (const param of action.params) {
    if (!param.label) {
      param.label = convertString(param.key, "title", true);
    }
  }
}

/** Defines a settings type for the ORM. */
export function defineSettings<S extends string>(
  settingsName: S,
  config: SettingsConfig<S>,
): SettingsType<S> {
  return new SettingsType(settingsName, config);
}
