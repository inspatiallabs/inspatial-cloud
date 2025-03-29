import type { CloudExtension } from "#/cloud-extension.ts";
import InSpatialServer, {
  InResponse,
  type ServerExtension,
} from "@inspatial/serve";
import { dbExtension, type InSpatialDB } from "#db";
import actionsAPI, {
  type ActionsAPI,
  type ActionsAPIAction,
} from "@inspatial/serve/actions-api";
import corsExtension from "@inspatial/serve/cors";
import realtimeExtension, {
  type RealtimeHandler,
} from "@inspatial/serve/realtime";
import type { CloudAction, CloudActionGroup } from "#/cloud-action.ts";
import { InRequest } from "@inspatial/serve";
import type { AppEntryHooks, ReturnActionMap, RunActionMap } from "#/types.ts";

import { type EntryType, InSpatialORM, type SettingsType } from "#orm";
import type { GlobalEntryHooks, GlobalHookFunction } from "#orm/types";
import ormCloudExtension from "#extension/orm/mod.ts";
import authCloudExtension from "#extension/auth/mod.ts";
import cloudLogger from "#/cloud-logger.ts";
import { ORMException } from "#orm";

export class InSpatialCloud<
  N extends string = string,
  P extends Array<CloudExtension> = [],
> {
  readonly appName: N;
  server: InSpatialServer<{
    extensions: P[number]["serverExtensions"] | [
      ServerExtension<"actions-api", ActionsAPI>,
      ServerExtension<"cors", void>,
      ServerExtension<"realtime", RealtimeHandler>,
      ServerExtension<"db", InSpatialDB>,
      ServerExtension<"orm", InSpatialORM>,
    ];
  }>;
  get api(): ActionsAPI {
    return this.server.getExtension("actions-api") as ActionsAPI;
  }
  get realtime(): RealtimeHandler {
    return this.server.getExtension("realtime") as RealtimeHandler;
  }
  get db(): InSpatialDB {
    return this.server.getExtension("db") as InSpatialDB;
  }
  orm: InSpatialORM;

  ready: Promise<boolean>;

  #ActionGroups: Map<string, CloudActionGroup> = new Map();

  #appExtensions: Map<string, CloudExtension> = new Map();

  fetch!: Deno.ServeHandler;

  constructor(appName: N, config?: {
    appExtensions?: P;
    /**
     * Built-in extensions configuration.
     * These extensions are enabled by default, and can be disabled by setting the value to `false`.
     */
    builtInExtensions?: {
      /**
       * Enable or disable the ORM extension.
       */
      orm?: boolean;
      /**
       * Enable or disable the Auth extension.
       */
      auth?: boolean;
    };
  }) {
    this.appName = appName;

    const extensions: Array<ServerExtension> = [
      actionsAPI,
      corsExtension,
      realtimeExtension,
      dbExtension,
    ];

    const appEntries: Array<EntryType> = [];
    const appSettings: Array<SettingsType> = [];
    const globalHooks: GlobalEntryHooks = {
      beforeValidate: [],
      validate: [],
      beforeCreate: [],
      afterCreate: [],
      beforeUpdate: [],
      afterUpdate: [],
      beforeDelete: [],
      afterDelete: [],
    };
    this.#ActionGroups = new Map();
    this.#appExtensions = new Map();

    const builtInExtensions = {
      orm: config?.builtInExtensions?.orm ?? true,
      auth: config?.builtInExtensions?.auth ?? true,
    };

    const appExtensions: Array<CloudExtension> = [];
    if (builtInExtensions.auth) {
      appExtensions.push(authCloudExtension);
    }
    if (builtInExtensions.orm) {
      appExtensions.push(ormCloudExtension);
    }
    if (config?.appExtensions) {
      appExtensions.push(...config.appExtensions);
    }

    for (const appExtension of appExtensions) {
      if (this.#appExtensions.has(appExtension.key)) {
        throw new Error(
          `AppExtension with key ${appExtension.key} already exists`,
        );
      }
      const { entryTypes, settingsTypes, ormGlobalHooks } = appExtension;
      appEntries.push(...entryTypes);
      appSettings.push(...settingsTypes);
      this.#appExtensions.set(appExtension.key, appExtension);
      extensions.push(...appExtension.serverExtensions);
      if (ormGlobalHooks) {
        for (const hookName of Object.keys(ormGlobalHooks)) {
          const hooks = ormGlobalHooks[hookName as keyof AppEntryHooks];
          for (const hook of hooks) {
            const newHook: GlobalHookFunction = async (
              { entry, entryType, orm },
            ) => {
              return await hook(this, { entry, entryType, orm });
            };
            globalHooks[hookName as keyof GlobalEntryHooks].push(newHook);
          }
        }
      }
    }
    try {
      this.server = new InSpatialServer({
        extensions,
      });

      this.orm = new InSpatialORM({
        db: this.db,
        entries: appEntries,
        settings: appSettings,
        globalEntryHooks: globalHooks,
      });
      this.server.addCustomProperty({
        key: "orm",
        value: this.orm,
        description: "ORM instance",
      });
    } catch (e) {
      this.#handleInitError(e);
    }

    this.#setup();
    this.ready = new Promise((resolve) => {
      this.boot().then(() => {
        resolve(true);
      });
      this.fetch = this.server.fetch.bind(this.server);
    });
  }

  #setup(): void {
    for (const appExtension of this.#appExtensions.values()) {
      this.#installAppExtension(appExtension);
    }
  }

  #installAppExtension(appExtension: CloudExtension): void {
    const { actionGroups } = appExtension;

    for (const actionGroup of actionGroups) {
      if (this.#ActionGroups.has(actionGroup.groupName)) {
        throw new Error(
          `Action group with name ${actionGroup.groupName} already exists`,
        );
      }
      this.#ActionGroups.set(actionGroup.groupName, actionGroup);
      const actions = new Map<string, ActionsAPIAction>();

      for (const action of actionGroup.actions) {
        const actionObject: ActionsAPIAction = {
          actionName: action.actionName,
          description: action.description,
          label: action.label,
          params: Array.from(action.params.values()),
          handler: async (data, _server, inRequest, inResponse) => {
            return await action.run({
              app: this,
              params: data,
              inRequest,
              inResponse,
            });
          },
        };

        actions.set(action.actionName, actionObject);
      }
      this.api.addGroup({
        groupName: actionGroup.groupName,
        label: actionGroup.label,
        description: actionGroup.description,
        actions: actions,
      });
    }

    appExtension.install(this);
  }

  async runAction<
    AG extends keyof RunActionMap<P>,
    AN extends keyof RunActionMap<P>[AG],
  >(
    groupName: AG,
    actionName: AN,
    ...args: RunActionMap<P>[AG][AN] extends undefined ? [] // If D is undefined, no third argument allowed
      : [data: RunActionMap<P>[AG][AN]] // Otherwise, require data
  ): Promise<ReturnActionMap<P>[AG][AN]> {
    const gn = groupName as string;
    const an = actionName as string;
    const group = this.#ActionGroups.get(gn);
    if (!group) {
      throw new Error(`Action group ${gn} not found`);
    }
    let data = {} as any;
    if (args.length === 1) {
      data = args[0] as any;
    }
    const action = group.actions.find((a) => a.actionName === actionName);
    if (!action) {
      throw new Error(`Action ${an} not found in group ${gn}`);
    }
    return await action.run({
      app: this,
      params: data,
      inRequest: new InRequest(new Request("http://localhost")),
      inResponse: new InResponse(),
    });
  }

  async generateConfigFile(): Promise<void> {
    await this.server.generateConfigFile();
  }
  private async boot(): Promise<void> {
    // await this.orm.init();
  }

  async run(): Promise<void> {
    await this.ready;

    this.server.run();
  }

  #handleInitError(e: unknown): never {
    if (e instanceof ORMException) {
      cloudLogger.warn(e.message, e.subject || "ORM Error");
      cloudLogger.warn(
        "Exiting due to ORM initialization error",
        "Cloud Init",
      );
      Deno.exit(1);
    }
    if (e instanceof Error) {
      cloudLogger.error(e.message, e.stack || "No stack trace available");
    }
    cloudLogger.error(
      "Exiting due to errors in cloud initialization",
      "Cloud Init",
    );
    Deno.exit(1);
  }
}
