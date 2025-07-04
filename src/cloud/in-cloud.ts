import type { AppMode, CloudConfig } from "#types/mod.ts";
import ormCloudExtension from "#extensions/orm/mod.ts";
import { CloudAPI } from "../api/cloud-api.ts";
import type { CloudExtension } from "../app/cloud-extension.ts";
import { baseExtension } from "../base-extension/base-extension.ts";
import { ExtensionManager } from "../extension-manager/extension-manager.ts";
import { type InLog, inLog } from "#inLog";
import type { LogLevel } from "../in-log/types.ts";
import type { InSpatialORM } from "~/orm/mod.ts";
import { joinPath, normalizePath } from "~/utils/path-utils.ts";

import { filesExtension } from "#extensions/files/src/files-extension.ts";
import type { ExceptionHandlerResponse } from "#types/serve-types.ts";
import { setupOrm } from "~/orm/setup-orm.ts";
import {
  isServerException,
  raiseServerException,
} from "../app/server-exception.ts";
import { ORMException } from "~/orm/orm-exception.ts";
import type { CloudAPIGroup } from "../api/cloud-group.ts";
import { InLiveHandler } from "../in-live/in-live-handler.ts";
import type { CloudExtensionInfo } from "../app/types.ts";
import { InRequest } from "../app/in-request.ts";
import { InResponse } from "../app/in-response.ts";
import {
  generateCloudConfigFile,
  generateConfigSchema,
} from "../cloud-config/cloud-config.ts";
import { InCache } from "../app/cache/in-cache.ts";
import { emailExtension } from "#extensions/email/mod.ts";
import type {
  ConfigKey,
  ConfigMap,
  ExtensionConfig,
  ExtractConfig,
} from "../cloud-config/config-types.ts";
import { RoleManager } from "~/orm/roles/role.ts";
import { StaticFileHandler } from "../static/staticFileHandler.ts";
import type { CloudRunnerMode } from "../../cli/src/types.ts";
import { onboarding } from "../onboarding/onboarding.ts";
import { authCloudExtension } from "../auth/mod.ts";

export class InCloud {
  appName: string;
  mode: AppMode = "production";
  runMode: CloudRunnerMode;
  // extensions
  extensionManager!: ExtensionManager;
  extensionObjects: Map<string, object> = new Map();
  customProperties: Map<string, unknown> = new Map();

  // Functionality
  orm!: InSpatialORM;
  systemOrm!: InSpatialORM;
  api!: CloudAPI;
  roles: RoleManager;
  inLog: InLog;
  static: StaticFileHandler;

  inLive: InLiveHandler;
  inCache: InCache;
  /**
   * The absolute path to the cloud root directory.
   */
  cloudRoot: string;
  /**
   * The absolute path to the `.inspatial` directory in the app root.
   */
  inRoot: string;
  filesPath: string;
  #config: CloudConfig;
  constructor(appName: string, config: CloudConfig, runMode: CloudRunnerMode) {
    this.runMode = runMode;
    this.cloudRoot = normalizePath(Deno.cwd());
    this.inRoot = joinPath(this.cloudRoot, ".inspatial");
    this.filesPath = joinPath(this.inRoot, "files");
    this.appName = appName;
    this.inLog = inLog;
    this.#config = config;
    this.inLive = new InLiveHandler();
    this.inCache = new InCache();
    this.api = new CloudAPI();
    this.roles = new RoleManager();
    this.static = new StaticFileHandler();
    this.roles.addRole({
      roleName: "systemAdmin",
      description: "System Administrator",
      label: "System Admin",
    });
  }
  init() {
    // Extension manager initialization
    this.extensionManager = new ExtensionManager();
    this.extensionManager.registerExtension(baseExtension);

    // InLog initialization
    const config = this.getExtensionConfig("cloud");

    this.inLog.setConfig({
      logLevel: config.logLevel as LogLevel,
      logTrace: config.logTrace,
    });

    this.#initExtensions();
    this.#setupOrm();
    this.#setDefaultHandler();
  }
  get installedExtensions(): Array<CloudExtensionInfo> {
    const installedExtensions = Array.from(
      this.extensionManager.extensions.values(),
    );
    return installedExtensions.map((extension) => extension.info);
  }
  #setDefaultHandler() {
    if (this.extensionManager.exceptionHandlers.size === 0) {
      this.extensionManager.exceptionHandlers.set("default", {
        name: "default",
        handler: (error) => {
          if (isServerException(error)) {
            return {
              status: error.status,
              serverMessage: {
                content: error.message,
                type: "error",
                subject: error.name,
              },
              clientMessage: error.message,
            };
          }
          if (error instanceof Error) {
            return {
              status: 500,
              serverMessage: {
                content: error.name + ": " + error.message,
                subject: "Unknown Error",
              },
            };
          }
        },
      });
    }
  }
  async boot(): Promise<void> {
    await this.orm.init();
    for (const extension of this.extensionManager.extensions.values()) {
      await extension.boot(this);
    }
  }
  async run(): Promise<void> {
    this.init();
    await this.boot();
    const brokerPort = this.getExtensionConfigValue(
      "cloud",
      "brokerPort",
    );
    this.inLive.init(brokerPort);
    this.inCache.init(brokerPort);
  }
  #initExtensions() {
    const appExtensions: Array<CloudExtension> = [
      ormCloudExtension,
      authCloudExtension,
      emailExtension,
      filesExtension,
      onboarding,
    ];

    appExtensions.push(...this.#config.extensions || []);
    for (const appExtension of appExtensions) {
      this.extensionManager.registerExtension(appExtension);
    }
    for (const role of this.extensionManager.roles.values()) {
      this.roles.addRole(role);
    }
    for (const extension of this.extensionManager.extensions.values()) {
      try {
        this.#installExtension(extension);
      } catch (e) {
        this.handleInitError(e);
      }
    }
  }
  #installExtension(appExtension: CloudExtension): void {
    const config = this.extensionManager.getExtensionConfig(appExtension.key);

    const { actionGroups } = appExtension;

    for (const actionGroup of actionGroups) {
      this.api.addGroup(actionGroup);
    }
    const extensionObject = appExtension.install(
      this,
      config as ExtensionConfig<any>,
    );
    if (extensionObject) {
      this.extensionObjects.set(appExtension.key, extensionObject);
    }
  }

  #setupOrm() {
    this.orm = setupOrm({
      inCloud: this,
      extensionManager: this.extensionManager,
    });
  }
  getExtensionConfig<K extends ConfigKey>(extensionKey: K): ExtractConfig<K> {
    return this.extensionManager.getExtensionConfig(extensionKey);
  }

  getExtensionConfigValue<
    C extends ConfigKey,
    K extends keyof ConfigMap[C],
  >(
    extension: C,
    key: K,
  ): ConfigMap[C][K];
  getExtensionConfigValue(extension: string, key: string): unknown;
  getExtensionConfigValue(extension: string, key: string) {
    return this.extensionManager.getExtensionConfigValue(extension, key);
  }
  getExtension<T = unknown>(extensionKey: string): T {
    if (!this.extensionObjects.has(extensionKey)) {
      raiseServerException(
        500,
        `Extension ${extensionKey} not found`,
      );
    }
    return this.extensionObjects.get(extensionKey) as T;
  }
  /**
   * Generates a cloud-config_generated.json file in the current working directory based on the installed extensions.
   */
  generateConfigFile(): void {
    generateConfigSchema(this);
    generateCloudConfigFile(this);
  }
  /**
   * Runs an action from the specified action group.
   */
  async runAction(
    groupName: string,
    actionName: string,
    data?: Record<string, any>,
  ): Promise<any> {
    const gn = groupName as string;
    const an = actionName as string;
    const group = this.actionGroups.get(gn);
    if (!group) {
      throw new Error(`Action group ${gn} not found`);
    }
    data = data || {} as any;
    const action = this.api.getAction(gn, an);

    return await action.run({
      inCloud: this,
      params: data,
      inRequest: new InRequest(new Request("http://localhost")),
      inResponse: new InResponse(),
    });
  }
  /**
   * Adds a custom property to the server instance.
   * @param prop The property to add.
   */
  addCustomProperty(prop: {
    key: string;
    description: string;
    value: unknown;
  }): void {
    Object.defineProperty(this, prop.key, {
      get: () => this.customProperties.get(prop.key),

      enumerable: true,
    });

    this.customProperties.set(prop.key, prop.value);
  }

  /**
   * Gets a custom property from the server instance that was added using `addCustomProperty`.
   * @param key The key of the custom property to get.
   */
  getCustomProperty<T>(key: string): T {
    if (!this.customProperties.has(key)) {
      raiseServerException(
        500,
        `Custom property ${key} not found`,
      );
    }
    return this.customProperties.get(key) as T;
  }
  get actionGroups(): Map<string, CloudAPIGroup> {
    return this.api.actionGroups;
  }
  handleInitError(e: unknown): never {
    for (const handler of this.extensionManager.exceptionHandlers.values()) {
      const response = handler.handler(e) as ExceptionHandlerResponse;
      if (response) {
        this.inLog.warn(
          response.serverMessage?.content,
          {
            stackTrace: e instanceof Error ? e.stack : undefined,
            subject: response.serverMessage?.subject,
          },
        );
        this.inLog.warn(
          "Exiting due to errors in cloud initialization",
          "Cloud Init",
        );
        Deno.exit(1);
      }
    }
    if (e instanceof ORMException) {
      this.inLog.warn(e.message, e.subject || "ORM Error");
      this.inLog.warn(
        "Exiting due to ORM initialization error",
        "Cloud Init",
      );
      Deno.exit(1);
    }
    if (e instanceof ReferenceError) {
      if (e.message.includes("BroadcastChannel")) {
        const message = [
          "InSpatial Cloud requires Deno's BroadcastChannel API to be enabled.\n",
          "Please run your app again with the --unstable-broadcast-channel flag,",
          'or add "unstable":["broadcast-channel"] to your deno.json file.',
        ];
        this.inLog.warn(
          message,
          "BroadcastChannel",
        );
        Deno.exit(1);
      }
    }
    if (e instanceof Error) {
      this.inLog.error(e.message, e.stack || "No stack trace available");
      throw e;
    }
    this.inLog.error(
      "Exiting due to errors in cloud initialization",
      "Cloud Init",
    );
    Deno.exit(1);
  }
}
