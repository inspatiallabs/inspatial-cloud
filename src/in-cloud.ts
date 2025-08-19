import type { AppMode, CloudConfig } from "#types/mod.ts";
import { CloudAPI } from "~/api/cloud-api.ts";

import { InLog, inLog } from "#inLog";
import type { LogLevel } from "~/in-log/types.ts";
import type { InSpatialORM } from "~/orm/mod.ts";
import { IS_WINDOWS, joinPath, normalizePath } from "~/utils/path-utils.ts";

import type { ExceptionHandlerResponse } from "#types/serve-types.ts";
import { setupOrm } from "~/orm/setup-orm.ts";
import {
  isServerException,
  raiseServerException,
} from "~/serve/server-exception.ts";
import { ORMException } from "~/orm/orm-exception.ts";
import type { CloudAPIGroup } from "~/api/cloud-group.ts";
import { InLiveHandler } from "~/in-live/in-live-handler.ts";

import type { CloudExtensionInfo } from "~/serve/types.ts";
import {
  generateCloudConfigFile,
  generateConfigSchema,
} from "~/cloud-config/cloud-config.ts";
import { InCache } from "~/in-cache/in-cache.ts";
import type {
  ConfigKey,
  ConfigMap,
  ExtensionConfig,
  ExtractConfig,
} from "~/cloud-config/config-types.ts";
import { RoleManager } from "~/orm/roles/role.ts";
import { CacheTime, StaticFileHandler } from "~/static/staticFileHandler.ts";
import { ExtensionManager } from "~/extension/extension-manager.ts";
import type { CloudExtension } from "~/extension/cloud-extension.ts";
import type { CloudRunnerMode } from "#cli/types.ts";
import { coreExtension } from "./extension/core-extension.ts";
import { AuthHandler } from "./auth/auth-handler.ts";
import { apiPathHandler } from "./api/api-handler.ts";
import { staticFilesHandler } from "./static/staticPathHandler.ts";
import { raiseCloudException } from "./serve/exeption/cloud-exception.ts";
import { InQueueClient } from "./in-queue/in-queue-client.ts";
import { EmailManager } from "./email/email-manager.ts";
import convertString from "./utils/convert-string.ts";

export class InCloud {
  appName: string;
  get appDisplayName(): string {
    return convertString(this.appName, "title", true);
  }
  mode: AppMode = "production";
  runMode: CloudRunnerMode;
  // extensions
  extensionManager!: ExtensionManager;
  extensionObjects: Map<string, object> = new Map();
  customProperties: Map<string, unknown> = new Map();

  // Functionality
  orm!: InSpatialORM;
  api!: CloudAPI;
  roles: RoleManager;
  inLog: InLog;
  static: StaticFileHandler;
  publicFiles: StaticFileHandler;
  privateFiles: StaticFileHandler;
  auth: AuthHandler;
  inLive: InLiveHandler;
  inCache: InCache;
  inQueue: InQueueClient;
  emailManager: EmailManager;
  /**
   * The absolute path to the cloud root directory.
   */
  cloudRoot: string;
  /**
   * The absolute path to the `.inspatial` directory in the app root.
   */
  inRoot: string;
  filesPath: string;
  publicFilesPath: string;
  #config: CloudConfig;
  #shutdownCallbacks: Array<() => void | Promise<void>> = [];
  constructor(appName: string, config: CloudConfig, runMode: CloudRunnerMode) {
    this.runMode = runMode;
    this.cloudRoot = normalizePath(config.projectRoot || Deno.cwd());
    this.inRoot = joinPath(this.cloudRoot, ".inspatial");
    this.filesPath = joinPath(this.inRoot, "files");
    this.publicFilesPath = joinPath(this.inRoot, "public-files");
    this.appName = appName;
    this.inLog = inLog;
    this.#config = config;
    this.inLive = new InLiveHandler(this);
    this.inCache = new InCache();
    this.api = new CloudAPI();
    this.roles = new RoleManager();
    this.static = new StaticFileHandler();
    this.publicFiles = new StaticFileHandler({
      staticFilesRoot: this.publicFilesPath,
      cacheHeader: {
        immutable: true,
        maxAge: CacheTime.day,
        public: true,
      },
    });
    this.privateFiles = new StaticFileHandler({
      staticFilesRoot: this.inRoot,
      cacheHeader: {
        immutable: true,
        maxAge: CacheTime.day,
      },
    });
    this.emailManager = new EmailManager(this);
    this.roles.addRole({
      roleName: "systemAdmin",
      description: "System Administrator",
      label: "System Admin",
    });
    this.auth = new AuthHandler(this);
    this.inQueue = new InQueueClient();
    this.#setupSignalListener();
  }
  #setupSignalListener() {
    let signalReceived = false;
    const shutdown = async (signal: string) => {
      if (signalReceived) {
        return; // Prevent multiple signals from triggering shutdown
      }
      signalReceived = true;
      const subject = `${signal}: ${this.runMode}`;
      const print = (message: string) => {
        if (signal === "SIGINT") {
          return;
        }
        inLog.warn(message, {
          subject,
          compact: true,
        });
      };
      print(
        `Received ${signal} signal. Shutting down gracefully...`,
      );

      let currentCallback = 0;
      for (const callback of this.#shutdownCallbacks) {
        currentCallback++;
        print(
          `Running shutdown callback ${currentCallback} of ${this.#shutdownCallbacks.length}`,
        );

        try {
          await callback();
        } catch (e) {
          inLog.error(
            "Error during shutdown callback: " + e,
            {
              subject,
            },
          );
          continue;
        }
        print(
          `Shutdown callback ${currentCallback} completed successfully`,
        );
      }
      await this.#stop();
      print(`${this.appDisplayName} has shut down successfully.`);

      Deno.exit(0);
    };
    Deno.addSignalListener("SIGINT", async () => await shutdown("SIGINT"));
    if (IS_WINDOWS) {
      return; // Windows does not support Deno.addSignalListener for SIGTERM
    }

    Deno.addSignalListener("SIGTERM", async () => await shutdown("SIGTERM"));
  }
  onShutdown(callback: () => void | Promise<void>): void {
    this.#shutdownCallbacks.push(callback);
  }
  async #stop() {
    await this.orm.db.pool?.shutdown();
  }
  init() {
    // Extension manager initialization
    this.extensionManager = new ExtensionManager();
    this.extensionManager.registerExtension(coreExtension);

    // InLog initialization
    const config = this.getExtensionConfig("core");
    this.inQueue.port = config.queuePort;
    this.inLog.setConfig({
      logLevel: config.logLevel as LogLevel,
      logTrace: config.logTrace,
    });
    this.#setupFS();
    this.#initExtensions();
    this.#setupAuth();
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
  }
  async run(): Promise<void> {
    this.init();
    await this.boot();
    const { brokerPort, queuePort } = this.getExtensionConfig(
      "core",
    );
    this.inLive.init(brokerPort);
    this.inCache.init(brokerPort);
    this.inQueue.init(queuePort);
  }
  #initExtensions() {
    const cloudExtensions: Array<CloudExtension> = [];

    cloudExtensions.push(...this.#config.extensions || []);
    for (const appExtension of cloudExtensions) {
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
  #installExtension(cloudExtension: CloudExtension): void {
    const config = this.extensionManager.getExtensionConfig(cloudExtension.key);

    const { actionGroups } = cloudExtension;

    for (const actionGroup of actionGroups) {
      this.api.addGroup(actionGroup);
    }
    const extensionObject = cloudExtension.install(
      this,
      config as ExtensionConfig<any>,
    );
    if (extensionObject) {
      this.extensionObjects.set(cloudExtension.key, extensionObject);
    }
  }
  #setupFS() {
    const config = this.getExtensionConfig("core");
    Deno.mkdirSync(this.filesPath, { recursive: true });
    Deno.mkdirSync(this.publicFilesPath, { recursive: true });
    try {
      const path = Deno.realPathSync(config.publicRoot);
      this.static.staticFilesRoot = normalizePath(path);
    } catch (e) {
      if (e instanceof Deno.errors.NotFound) {
        if (config.publicRoot === "./public") {
          Deno.mkdirSync(config.publicRoot, { recursive: true });
          this.static.staticFilesRoot = normalizePath(
            Deno.realPathSync(config.publicRoot),
          );
          return;
        }
        raiseCloudException(
          `Public root directory not found: ${config.publicRoot}`,
        );
      }
      throw e;
    }
    this.static.setSpa({
      enabled: config.singlePageApp,
      paths: config.spaRootPaths || [],
    });
    this.static.setCache({
      enable: config.cacheStatic,
      cacheTime: CacheTime.week,
      cacheHeader: {
        immutable: true,
        maxAge: CacheTime.day,
      },
    });

    this.static.init(
      this.static.staticFilesRoot.replace(this.cloudRoot, "."),
    );
  }
  #setupAuth() {
    this.auth.allowPath(apiPathHandler.match);
    this.auth.allowPath(staticFilesHandler.match);
    const allowAll = this.getExtensionConfigValue("core", "authAllowAll");
    for (const group of this.actionGroups.values()) {
      for (const action of group.actions.values()) {
        if (allowAll === true) {
          this.auth.allowAction(group.groupName, action.actionName);
          continue;
        }
        if (action.includeInAPI && !action.authRequired) {
          this.auth.allowAction(group.groupName, action.actionName);
        }
      }
    }
  }
  #setupOrm() {
    this.orm = setupOrm({
      inCloud: this,
      dbClientQuery: this.#config.dbClientQuery,
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
