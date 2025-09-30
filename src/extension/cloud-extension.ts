import type { ExceptionHandler } from "#types/serve-types.ts";
import type { PathHandler } from "~/serve/path-handler.ts";
import type { RequestLifecycle } from "~/serve/request-lifecycle.ts";
import { convertString } from "~/utils/mod.ts";
import type { EntryType } from "~/orm/entry/entry-type.ts";
import type { SettingsType } from "~/orm/settings/settings-type.ts";

import type {
  AfterOnboarding,
  CloudExtensionInfo,
  ExtensionOptions,
} from "~/serve/types.ts";
import type { Middleware } from "~/serve/middleware.ts";
import type { GlobalSettingsHooks } from "~/orm/orm-types.ts";
import type { CloudAPIGroup } from "~/api/cloud-group.ts";
import type {
  ConfigDefinition,
  ExtensionConfig,
} from "../cloud-config/config-types.ts";
import type { RoleConfig } from "~/orm/roles/role.ts";
import type { InSpatialORM } from "../orm/inspatial-orm.ts";
import type { InCloud } from "../in-cloud.ts";
import type { GlobalEntryHooks } from "@inspatial/cloud/types";
export type CloudInstallFunction<R = any> = (
  inCloud: InCloud,
) => R;
export type CloudBootFunction = (inCloud: InCloud) => Promise<void> | void;
export type AfterMigrate = {
  name: string;
  description?: string;
  action(
    args: { inCloud: InCloud; orm: InSpatialORM },
  ): Promise<void> | void;
};
export class CloudExtension<
  AG extends Array<CloudAPIGroup> = Array<CloudAPIGroup>,
  N extends string = string,
  C extends ConfigDefinition = ConfigDefinition,
> {
  key: string;
  label: string;
  description: string;
  version?: string;
  icon?: string;
  /**
   * The lifecycle handlers for incoming requests.
   */
  readonly requestLifecycle: RequestLifecycle<C>;
  /**
   * The list of middleware for the extension.
   */
  readonly middleware: Middleware[];
  /**
   * The list of path handlers of the extension.
   */
  readonly pathHandlers: PathHandler[];
  /**
   * The list of exception handlers of the extension.
   */
  readonly exceptionHandlers: ExceptionHandler[];
  /**
   * The environment variable configuration for the extension.
   */
  config?: C;

  afterOnboarding?: AfterOnboarding;

  entryTypes: EntryType[];
  settingsTypes: SettingsType[];
  roles: RoleConfig[];
  ormGlobalEntryHooks: GlobalEntryHooks;
  ormGlobalSettingsHooks: GlobalSettingsHooks;
  afterMigrate: {
    account: AfterMigrate[];
    global: AfterMigrate[];
  };
  apiGroups: AG;
  install: (
    inCloud: InCloud,
    config: ExtensionConfig<C>,
  ) => Promise<object | void> | object | void;

  constructor(
    extensionName: N,
    options: Omit<ExtensionOptions<AG, C>, "name"> & {
      label?: string;
      description?: string;
    },
  ) {
    this.afterMigrate = {
      account: [],
      global: [],
    };
    this.afterOnboarding = options.afterOnboarding;
    this.key = extensionName;
    this.label = options.label || convertString(extensionName, "title", true);
    this.description = options.description || "";
    this.version = options.version || "1.0.0";
    this.roles = options.roles || [];
    this.icon = options.icon || "extension";
    const { settings, entries } = options.ormGlobalHooks || {};

    this.ormGlobalEntryHooks = {
      beforeValidate: entries?.beforeValidate || [],
      validate: entries?.validate || [],
      beforeCreate: entries?.beforeCreate || [],
      afterCreate: entries?.afterCreate || [],
      beforeUpdate: entries?.beforeUpdate || [],
      afterUpdate: entries?.afterUpdate || [],
      beforeDelete: entries?.beforeDelete || [],
      afterDelete: entries?.afterDelete || [],
    };
    this.ormGlobalSettingsHooks = {
      afterUpdate: settings?.afterUpdate || [],
      beforeUpdate: settings?.beforeUpdate || [],
      beforeValidate: settings?.beforeValidate || [],
      validate: settings?.validate || [],
    };
    const { afterAccountMigrate, afterGlobalMigrate } = options;
    if (afterAccountMigrate) {
      this.afterMigrate.account = Array.isArray(afterAccountMigrate)
        ? afterAccountMigrate
        : [afterAccountMigrate];
    }
    if (afterGlobalMigrate) {
      this.afterMigrate.global = Array.isArray(afterGlobalMigrate)
        ? afterGlobalMigrate
        : [afterGlobalMigrate];
    }
    this.config = options.config;
    this.requestLifecycle = {
      setup: options.requestLifecycle?.setup || [],
      cleanup: options.requestLifecycle?.cleanup || [],
    };
    this.middleware = options.middleware || [];
    this.pathHandlers = options.pathHandlers || [];
    this.exceptionHandlers = options.exceptionHandlers || [];
    this.#validateConfigEnv();
    this.entryTypes = options.entryTypes || [];
    this.settingsTypes = options.settingsTypes || [];
    this.apiGroups = [] as any;
    for (const actionGroup of options.apiGroups || []) {
      this.apiGroups.push(actionGroup);
    }
    this.install = options.install || (() => {});

    this.#setup();
    Object.freeze(this);
  }

  #setup() {
    const info = this.info;
    const extensionInfo = {
      key: info.key,
      label: info.label,
      description: info.description,
      extensionType: {
        key: "cloud",
        label: "Cloud Extension",
      },
    };
    for (const entryType of this.entryTypes) {
      entryType.extension = info.key;
      entryType.config.extension = extensionInfo;
    }

    for (const settingType of this.settingsTypes) {
      settingType.extension = info.key;
      settingType.config.extension = extensionInfo;
    }
  }
  #validateConfigEnv() {
    if (!this.config) return;
    for (const key in this.config) {
      const configDef = this.config[key];
      if (!configDef.env) {
        this.config[key].env = convertString(key, "snake", true).toUpperCase();
      }
    }
  }
  /**
   * Returns information about the extension.
   */
  get info(): CloudExtensionInfo {
    const getDetailInfo = (input?: Array<Record<string, any>>) => {
      if (!input || input.length === 0) return [];
      return input.map((item) => {
        return {
          name: item.name,
          description: item.description,
        };
      });
    };
    const middleware = getDetailInfo(this.middleware);
    const pathHandlers = this.pathHandlers?.map((p) => {
      return {
        name: p.name,
        match: p.match.source,
        description: p.description,
      };
    }) || [];

    const setup = getDetailInfo(this.requestLifecycle?.setup);

    const cleanup = getDetailInfo(this.requestLifecycle?.cleanup);
    const globalMigrate = getDetailInfo(this.afterMigrate.global);
    const accountMigrate = getDetailInfo(this.afterMigrate.account);
    return {
      key: this.key,
      label: this.label,
      description: this.description,
      version: this.version,
      config: this.config || {},
      middleware,
      pathHandlers,
      lifeCycleHanders: {
        setup,
        cleanup,
      },
      globalMigrate,
      accountMigrate,
    };
  }
}

export function defineExtension<
  AG extends Array<CloudAPIGroup> = Array<CloudAPIGroup>,
  N extends string = string,
  C extends ConfigDefinition = ConfigDefinition,
>(
  extensionName: N,
  config: Omit<ExtensionOptions<AG, C>, "name"> & {
    label?: string;
    description?: string;
  },
): CloudExtension<AG, N, C> {
  return new CloudExtension<AG, N, C>(extensionName, config);
}
