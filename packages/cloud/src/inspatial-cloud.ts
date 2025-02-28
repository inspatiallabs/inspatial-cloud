// import ormExtension, { type EasyOrm } from "../../easy-orm/mod.ts";
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
import type { CloudActionGroup } from "#/cloud-action.ts";
import { InRequest } from "@inspatial/serve";
import type { AppEntryHooks, ReturnActionMap, RunActionMap } from "#/types.ts";

import { EntryType, InSpatialORM, SettingsType } from "#orm";
import { ormExtension } from "../app-extensions/orm/mod.ts";
import { GlobalEntryHooks, GlobalHookFunction } from "../../orm/src/types.ts";

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
    const appExtensions: Array<CloudExtension> = [ormExtension];
    if (config?.appExtensions) {
      appExtensions.push(...config.appExtensions);
    }

    for (const appExtension of appExtensions) {
      if (this.#appExtensions.has(appExtension.key)) {
        throw new Error(
          `AppExtention with key ${appExtension.key} already exists`,
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
    this.server = new InSpatialServer({
      extensions,
    });
    this.orm = new InSpatialORM({
      db: this.db,
      entries: appEntries,
      settings: appSettings,
      globalEntryHooks: globalHooks,
    });

    this.#setup();
    this.ready = new Promise((resolve) => {
      this.boot().then(() => {
        resolve(true);
      });
      this.fetch = this.server.fetch.bind(this.server);
    });
  }

  #setup() {
    for (const appExtension of this.#appExtensions.values()) {
      this.#installAppExtension(appExtension);
    }
  }

  #installAppExtension(appExtension: CloudExtension) {
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
        actions.set(action.actionName, {
          actionName: action.actionName,
          description: action.description,
          params: Array.from(action.params.values()),
          handler: async (data, _server, inRequest, inResponse) => {
            return await action.run({
              app: this,
              params: data,
              inRequest,
              inResponse,
            });
          },
        });
      }
      this.api.addGroup({
        groupName: actionGroup.groupName,
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

  async generateConfigFile() {
    await this.server.generateConfigFile();
  }
  private async boot() {
    // await this.orm.init();
  }

  async run() {
    await this.ready;

    this.server.run();
  }
}
