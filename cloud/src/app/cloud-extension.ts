import type { InSpatialCloud } from "#/inspatial-cloud.ts";
import type {
  ConfigDefinition,
  ExceptionHandler,
  ExtensionConfig,
} from "#types/serve-types.ts";
import type { PathHandler } from "#/app/path-handler.ts";
import type { RequestLifecycle } from "#/app/request-lifecycle.ts";
import { convertString } from "#/utils/mod.ts";
import type { EntryType } from "#/orm/entry/entry-type.ts";
import type { SettingsType } from "#/orm/settings/settings-type.ts";
import type { CloudAPIGroup } from "#/app/cloud-action.ts";
import type { CloudExtensionInfo } from "#/app/types.ts";
import type { Middleware } from "#/app/middleware.ts";
import type { EntryHooks } from "#/orm/orm-types.ts";
export type CloudInstallFunction<R = any> = (
  app: InSpatialCloud,
) => R;
export type CloudBootFunction = (app: InSpatialCloud) => Promise<void> | void;

export class CloudExtension<
  AG extends Array<CloudAPIGroup> = Array<CloudAPIGroup>,
  N extends string = string,
  E extends Array<EntryType<any>> = Array<EntryType<any>>,
  ST extends Array<SettingsType<any>> = Array<SettingsType<any>>,
  C extends ConfigDefinition = ConfigDefinition,
> {
  key: string;
  label: string;
  description: string;
  version: string;
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

  entryTypes: EntryType[];
  settingsTypes: SettingsType[];
  ormGlobalHooks: EntryHooks;
  actionGroups: AG;
  install: (
    app: InSpatialCloud,
    config: ExtensionConfig<C>,
  ) => Promise<object | void> | object | void;
  boot: CloudBootFunction;

  constructor(extensionName: N, options: {
    label: string;
    description: string;
    version: string;
    config?: C;
    entryTypes?: E;
    settingsTypes?: ST;
    ormGlobalHooks?: Partial<EntryHooks>;
    actionGroups?: AG;
    install?(
      app: InSpatialCloud,
      config: ExtensionConfig<C>,
    ): Promise<object | void> | object | void;
    boot?: CloudBootFunction;
    /** The lifecycle handlers for the incoming requests. */
    requestLifecycle?: Partial<RequestLifecycle<C>>;
    /** Request middleware */
    middleware?: Middleware[];

    /** Path handlers */
    pathHandlers?: PathHandler[];
    /** Exception handlers */
    exceptionHandlers?: ExceptionHandler[];
  }) {
    this.key = extensionName;
    this.label = options.label;
    this.description = options.description;
    this.version = options.version;

    const globalHooks = options.ormGlobalHooks;
    this.ormGlobalHooks = {
      beforeValidate: globalHooks?.beforeValidate || [],
      validate: globalHooks?.validate || [],
      beforeCreate: globalHooks?.beforeCreate || [],
      afterCreate: globalHooks?.afterCreate || [],
      beforeUpdate: globalHooks?.beforeUpdate || [],
      afterUpdate: globalHooks?.afterUpdate || [],
      beforeDelete: globalHooks?.beforeDelete || [],
      afterDelete: globalHooks?.afterDelete || [],
    };
    /* Server Extension */
    this.config = options.config;
    this.requestLifecycle = {
      setup: options.requestLifecycle?.setup || [],
      cleanup: options.requestLifecycle?.cleanup || [],
    };
    this.middleware = options.middleware || [];
    this.pathHandlers = options.pathHandlers || [];
    this.exceptionHandlers = options.exceptionHandlers || [];
    this.#validateConfigEnv();
    /*End server extension */
    this.entryTypes = options.entryTypes || [];
    this.settingsTypes = options.settingsTypes || [];
    this.actionGroups = [] as any;
    for (const actionGroup of options.actionGroups || []) {
      this.actionGroups.push(actionGroup);
    }
    this.install = options.install || (() => {});
    this.boot = options.boot || (() => {});
    this.#setup();
    Object.freeze(this);
  }

  #setup() {
    for (const entryType of this.entryTypes) {
      entryType.config.extension = {
        ...this.info,
        extensionType: {
          key: "cloud",
          label: "Cloud Extension",
        },
      };
    }

    for (const settingType of this.settingsTypes) {
      settingType.config.extension = {
        ...this.info,
        extensionType: {
          key: "cloud",
          label: "Cloud Extension",
        },
      };
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
  get info(): CloudExtensionInfo {
    const middleware = this.middleware?.map((m) => {
      return {
        name: m.name,
        description: m.description,
      };
    }) || [];

    const pathHandlers = this.pathHandlers?.map((p) => {
      return {
        name: p.name,
        path: p.path,
        description: p.description,
      };
    }) || [];

    const setup = this.requestLifecycle?.setup.map((l) => {
      return {
        name: l.name,
        description: l.description,
      };
    }) || [];

    const cleanup = this.requestLifecycle?.cleanup.map((l) => {
      return {
        name: l.name,
        description: l.description,
      };
    }) || [];
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
    };
  }
}
