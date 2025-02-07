// import ormExtension, { type EasyOrm } from "../../easy-orm/mod.ts";
import type { AppExtension } from "#/app-extension.ts";
import InSpatialServer, { InResponse, type ServerExtension } from "#serve";
import { dbExtension, type InSpatialDB } from "#db";
import actionsAPI, {
  type ActionsAPI,
  type ActionsAPIAction,
} from "#serve/actions-api";
import corsExtension from "#serve/cors";
import realtimeExtension, { type RealtimeHandler } from "#serve/realtime";
import type { AppActionGroup } from "./app-action.ts";
import { InRequest } from "../../serve/src/in-request.ts";
import type { ReturnActionMap, RunActionMap } from "./types.ts";
export class InSpatialApp<
  N extends string = string,
  P extends Array<AppExtension> = [],
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
  // orm!: EasyOrm;

  ready: Promise<boolean>;

  #ActionGroups: Map<string, AppActionGroup> = new Map();

  #appExtensions: Map<string, AppExtension> = new Map();

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
      // ormExtension,
    ];

    this.#ActionGroups = new Map();
    this.#appExtensions = new Map();
    // this._easyPacks.set(basePack.key, basePack);
    if (config?.appExtensions) {
      for (const appExtension of config.appExtensions) {
        if (this.#appExtensions.has(appExtension.key)) {
          throw new Error(
            `EasyPack with key ${appExtension.key} already exists`,
          );
        }
        this.#appExtensions.set(appExtension.key, appExtension);
        extensions.push(...appExtension.serverExtensions);
      }
    }
    this.server = new InSpatialServer({
      extensions,
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

  #installAppExtension(appExtension: AppExtension) {
    const { actionGroups, entryTypes } = appExtension;

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
          handler: async (data, server, inRequest, inResponse) => {
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

    for (const entryType of entryTypes) {
      // this.orm.addEntryType(entryType);
    }
    for (const settingsType of appExtension.settingsTypes) {
      // this.orm.addSettingsType(settingsType);
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
