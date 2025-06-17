import type { CloudExtension } from "#/app/cloud-extension.ts";

import { CloudAPI } from "#/api/cloud-api.ts";
import { InCache } from "#/app/cache/in-cache.ts";
import { InRequest } from "#/app/in-request.ts";
import authCloudExtension from "#extensions/auth/mod.ts";
import ormCloudExtension from "#extensions/orm/mod.ts";
import type { CloudExtensionInfo } from "#/app/types.ts";
import {
  generateCloudConfigFile,
  generateConfigSchema,
  loadCloudConfigFile,
} from "#/cloud-config/cloud-config.ts";
import {
  isServerException,
  raiseServerException,
} from "#/app/server-exception.ts";
import { InResponse } from "#/app/in-response.ts";
import { ORMException } from "#/orm/orm-exception.ts";
import { ExtensionManager } from "#/extension-manager/extension-manager.ts";
import type { AppMode, CloudConfig } from "#types/mod.ts";
import type { InSpatialORM } from "#/orm/inspatial-orm.ts";
import { baseExtension } from "#/base-extension/base-extension.ts";
import { InLiveHandler } from "#/in-live/in-live-handler.ts";
import { requestHandler } from "#/app/request-handler.ts";
import { setupOrm } from "#/orm/setup-orm.ts";
import { type InLog, inLog } from "#/in-log/in-log.ts";
import { makeLogo } from "#/in-log/logo.ts";
import { center, joinPath } from "#/utils/mod.ts";
import ColorMe from "#/utils/color-me.ts";
import convertString from "#/utils/convert-string.ts";
import type { LogLevel } from "#/in-log/types.ts";
import { initCloud } from "#/init.ts";
import type { ExceptionHandlerResponse } from "#types/serve-types.ts";
import { filesExtension } from "#extensions/files/src/files-extension.ts";
import { normalizePath } from "./utils/path-utils.ts";
import type { CloudAPIGroup } from "#/api/cloud-group.ts";
export type RunMode = "denoServe" | "run";
export class InCloud<
  N extends string = any,
  P extends Array<CloudExtension> = any,
> {
  readonly appName: N;
  #extensionManager: ExtensionManager;
  #extensionObjects: Map<string, object> = new Map();
  #customProperties: Map<string, unknown> = new Map();
  #mode: AppMode = "production";
  #appRoot: string;
  /**
   * The absolute path to the app root directory.
   */
  get appRoot(): string {
    return this.#appRoot;
  }
  /**
   * The absolute path to the `.inspatial` directory in the app root.
   */
  get inRoot(): string {
    return joinPath(this.#appRoot, ".inspatial");
  }

  get filesPath(): string {
    return joinPath(this.#appRoot, ".inspatial", "files");
  }
  #config: CloudConfig;
  orm!: InSpatialORM;
  api: CloudAPI;

  inLive: InLiveHandler;
  inLog: InLog;

  inCache: InCache;

  ready: Promise<boolean>;

  get actionGroups(): Map<string, CloudAPIGroup> {
    return this.api.actionGroups;
  }

  fetch: (request: Request) => Promise<Response> = this.#requestHandler.bind(
    this,
  );

  /* Serve stuff */

  get mode(): AppMode {
    return this.#mode;
  }
  get installedExtensions(): Array<CloudExtensionInfo> {
    const installedExtensions = Array.from(
      this.#extensionManager.extensions.values(),
    );
    return installedExtensions.map((extension) => extension.info);
  }
  /* End serve stuff */

  constructor(appName: N, options?: {
    extensions?: P;
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
    config?: CloudConfig;
  }) {
    this.#appRoot = normalizePath(Deno.mainModule, { toDirname: true });
    Deno.env.set("IN_ROOT", this.inRoot);
    this.inLog = inLog;

    loadCloudConfigFile();
    this.#extensionManager = new ExtensionManager();
    this.#extensionManager.registerExtension(baseExtension);

    const config = this.getExtensionConfig<{
      logLevel?: LogLevel;
      logTrace?: boolean;
    }>("cloud");
    this.inLog.setConfig({
      logLevel: config.logLevel,
      logTrace: config.logTrace,
    });
    const mode = Deno.env.get("SERVE_MODE");
    switch (mode) {
      case "development":
      case "production":
        this.#mode = mode;
        break;
    }
    this.appName = appName;
    try {
      this.inCache = new InCache();
      this.inLive = new InLiveHandler();
    } catch (e) {
      this.#handleInitError(e);
    }

    this.api = new CloudAPI();
    /*Serve constructor */
    this.#config = {
      ...options?.config,
    };

    if (Deno.env.has("SERVE_PORT")) {
      this.#config.port = Number(Deno.env.get("SERVE_PORT"));
    }
    if (Deno.env.has("SERVE_HOSTNAME")) {
      this.#config.hostname = Deno.env.get("SERVE_HOSTNAME");
    }

    /*End Serve Constructor */
    const builtInExtensions = {
      orm: options?.builtInExtensions?.orm === false ? false : true,
      auth: options?.builtInExtensions?.auth === false ? false : true,
    };

    const appExtensions: Array<CloudExtension> = [];
    if (builtInExtensions.orm) {
      appExtensions.push(ormCloudExtension);
    }
    if (builtInExtensions.auth) {
      appExtensions.push(authCloudExtension);
    }

    appExtensions.push(filesExtension);

    if (options?.extensions) {
      appExtensions.push(...options.extensions);
    }

    for (const appExtension of appExtensions) {
      this.#extensionManager.registerExtension(appExtension);
    }
    initCloud(this);
    this.#setup();
    if (this.mode === "development") {
      const autoConfig = Deno.env.get("SERVE_AUTO_CONFIG");
      switch (autoConfig) {
        case "true":
        case "1":
        case "yes":
          this.inLog.info(
            "Auto generating serve config schema file",
          );
          this.generateConfigFile();
          break;
      }
    }
    if (this.#extensionManager.exceptionHandlers.size === 0) {
      this.#extensionManager.exceptionHandlers.set("default", {
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
    this.ready = new Promise((resolve) => {
      this.#boot().then(() => {
        resolve(true);
      }).catch((e) => {
        this.#handleInitError(e);
      });
    });
    this.fetch = this.fetch.bind(this);
  }

  async run(): Promise<Deno.HttpServer<Deno.NetAddr>> {
    await this.ready;
    return this.#serve();
  }

  getExtension<T = unknown>(extensionKey: string): T {
    if (!this.#extensionObjects.has(extensionKey)) {
      raiseServerException(
        500,
        `Extension ${extensionKey} not found`,
      );
    }
    return this.#extensionObjects.get(extensionKey) as T;
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
      app: this,
      params: data,
      inRequest: new InRequest(new Request("http://localhost")),
      inResponse: new InResponse(),
    });
  }
  /**
   * Generates a cloud-config_generated.json file in the current working directory based on the installed extensions.
   */
  generateConfigFile(): void {
    generateConfigSchema(this);
    generateCloudConfigFile(this);
  }

  getExtensionConfig<T>(extensionKey: string): T {
    return this.#extensionManager.getExtensionConfig<T>(extensionKey);
  }

  getExtensionConfigValue<T>(extension: string, key: string): T {
    return this.#extensionManager.getExtensionConfigValue<T>(extension, key);
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
      get: () => this.#customProperties.get(prop.key),

      enumerable: true,
    });

    this.#customProperties.set(prop.key, prop.value);
  }

  /**
   * Gets a custom property from the server instance that was added using `addCustomProperty`.
   * @param key The key of the custom property to get.
   */
  getCustomProperty<T>(key: string): T {
    if (!this.#customProperties.has(key)) {
      raiseServerException(
        500,
        `Custom property ${key} not found`,
      );
    }
    return this.#customProperties.get(key) as T;
  }

  #setup(): void {
    for (const extension of this.#extensionManager.extensions.values()) {
      try {
        this.#installExtension(extension);
      } catch (e) {
        this.#handleInitError(e);
      }
    }
    try {
      this.orm = setupOrm({
        app: this,
        extensionManager: this.#extensionManager,
      });
    } catch (e) {
      this.#handleInitError(e);
    }
  }

  #installExtension(appExtension: CloudExtension): void {
    const config = this.#extensionManager.getExtensionConfig(appExtension.key);

    const { actionGroups } = appExtension;

    for (const actionGroup of actionGroups) {
      this.api.addGroup(actionGroup);
    }
    const extensionObject = appExtension.install(this, config);
    if (extensionObject) {
      this.#extensionObjects.set(appExtension.key, extensionObject);
    }
  }

  async #boot(): Promise<void> {
    await this.orm.db.init();
    for (const extension of this.#extensionManager.extensions.values()) {
      await extension.boot(this);
    }
  }

  #serve(): Deno.HttpServer<Deno.NetAddr> {
    return Deno.serve(
      {
        hostname: this.#config.hostname,
        port: this.#config.port,
        onListen: (localAddr) => {
          const logo = makeLogo("downLeft", "brightMagenta");

          const url = `http://${localAddr.hostname}:${localAddr.port}`;

          const output = [
            logo,
            center(
              ColorMe.chain("basic").content(
                "InSpatial Cloud",
              ).color("brightMagenta")
                .content(" running at ")
                .color("brightWhite")
                .content(url)
                .color("brightCyan")
                .end(),
            ),
            center(
              "You can ping the server:",
            ),
            ColorMe.fromOptions(
              center(
                `http://${localAddr.hostname}:${localAddr.port}/api?group=api&action=ping`,
              ),
              {
                color: "brightYellow",
              },
            ),
          ];

          inLog.info(
            output.join("\n\n"),
            convertString(this.appName, "title", true),
          );
        },
      },
      this.#requestHandler.bind(this),
    );
  }
  async #requestHandler(request: Request): Promise<Response> {
    return await requestHandler(
      request,
      this,
      this.#extensionManager,
    );
  }

  #handleInitError(e: unknown): never {
    for (const handler of this.#extensionManager.exceptionHandlers.values()) {
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
