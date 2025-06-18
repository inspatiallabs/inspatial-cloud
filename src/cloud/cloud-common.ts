import type { AppMode, CloudConfig } from "#types/mod.ts";
import ormCloudExtension from "#extensions/orm/mod.ts";
import { CloudAPI } from "../api/cloud-api.ts";
import type { CloudExtension } from "../app/cloud-extension.ts";
import { baseExtension } from "../base-extension/base-extension.ts";
import { ExtensionManager } from "../extension-manager/extension-manager.ts";
import { type InLog, inLog } from "../in-log/in-log.ts";
import type { LogLevel } from "../in-log/types.ts";
import type { InSpatialORM } from "../orm/mod.ts";
import type { CloudRunnerMode, RunnerMode } from "../runner/types.ts";
import { joinPath, normalizePath } from "../utils/path-utils.ts";
import authCloudExtension from "#extensions/auth/mod.ts";
import { filesExtension } from "#extensions/files/src/files-extension.ts";
import type { ExceptionHandlerResponse } from "#types/serve-types.ts";
import { setupOrm } from "../orm/setup-orm.ts";
import {
  isServerException,
  raiseServerException,
} from "../app/server-exception.ts";
import { ORMException } from "../orm/orm-exception.ts";
import { CloudAPIGroup } from "../api/cloud-group.ts";
import { InLiveHandler } from "../in-live/in-live-handler.ts";
import { CloudExtensionInfo } from "../app/types.ts";

export class InCloudCommon {
  appName: string;
  mode: AppMode = "production";
  runMode: CloudRunnerMode;
  // extensions
  extensionManager!: ExtensionManager;
  extensionObjects: Map<string, object> = new Map();
  customProperties: Map<string, unknown> = new Map();

  // Functionality
  orm!: InSpatialORM;
  api!: CloudAPI;

  inLog: InLog;

  inLive!: InLiveHandler;
  // Paths
  cloudRoot: string;
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
  }
  async init() {
    // Extension manager initialization
    this.extensionManager = new ExtensionManager();
    this.extensionManager.registerExtension(baseExtension);

    // InLog initialization
    const config = this.getExtensionConfig<{
      logLevel?: LogLevel;
      logTrace?: boolean;
    }>("cloud");
    this.inLog.setConfig({
      logLevel: config.logLevel,
      logTrace: config.logTrace,
    });
    this.inLive = new InLiveHandler();
    this.api = new CloudAPI();

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
    await this.init();
    await this.boot();
    await this.inLive.init();
  }
  #initExtensions() {
    const appExtensions: Array<CloudExtension> = [
      ormCloudExtension,
      authCloudExtension,
      filesExtension,
    ];

    appExtensions.push(...this.#config.extensions || []);
    for (const appExtension of appExtensions) {
      this.extensionManager.registerExtension(appExtension);
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
    const extensionObject = appExtension.install(this, config);
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
  getExtensionConfig<T>(extensionKey: string): T {
    return this.extensionManager.getExtensionConfig<T>(extensionKey);
  }

  getExtensionConfigValue<T>(extension: string, key: string): T {
    return this.extensionManager.getExtensionConfigValue<T>(extension, key);
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
