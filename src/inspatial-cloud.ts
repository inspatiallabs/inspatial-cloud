import type { CloudExtension } from "#/app/cloud-extension.ts";

import { CloudAPI } from "#/api/cloud-api.ts";
import type { RealtimeHandler } from "#/realtime/mod.ts";
import { InCache } from "#/app/cache/in-cache.ts";
import type { CloudActionGroup } from "#/app/cloud-action.ts";
import type { ServerMiddleware } from "#/app/server-middleware.ts";
import { type PathHandler, RequestPathHandler } from "#/app/path-handler.ts";
import { InRequest } from "#/app/in-request.ts";
import authCloudExtension from "#extensions/auth/mod.ts";
import ormCloudExtension from "#extensions/orm/mod.ts";
import type {
  AppEntryHooks,
  CloudExtensionInfo,
  ReturnActionMap,
  RunActionMap,
} from "#/app/types.ts";
import type { GlobalEntryHooks, GlobalHookFunction } from "#/orm/orm-types.ts";
import type { ActionsAPIAction } from "#/api/api-types.ts";
import {
  generateConfigSchema,
  generateServeConfigFile,
  loadServeConfigFile,
} from "#/cloud-config/serve-config.ts";
import { serveLogger } from "#/logger/serve-logger.ts";
import {
  isServerException,
  raiseServerException,
} from "#/app/server-exception.ts";
import { InResponse } from "#/app/in-response.ts";
import cloudLogger from "#/app/cloud-logger.ts";
import { ORMException } from "#/orm/orm-exception.ts";
import { ExtensionManager } from "#/extension-manager/extension-manager.ts";
import type { AppMode, CloudConfig } from "#types/mod.ts";
import { InSpatialORM } from "#/orm/inspatial-orm.ts";
import { ClientConnectionType, DBConfig } from "#/orm/db/db-types.ts";
import { baseExtension } from "#/base-extension.ts";

export class InSpatialCloud<
  N extends string = string,
  P extends Array<CloudExtension> = [],
> {
  readonly appName: N;
  #extensionManager: ExtensionManager;
  #extensionObjects: Map<string, CloudExtension> = new Map();
  #mode: AppMode = "production";
  #config: CloudConfig;
  getExtension<T = unknown>(extensionKey: string): T {
    if (!this.#extensionObjects.has(extensionKey)) {
      raiseServerException(
        500,
        `Extension ${extensionKey} not found`,
      );
    }
    return this.#extensionObjects.get(extensionKey) as T;
  }
  orm!: InSpatialORM;
  api: CloudAPI;

  realtime: RealtimeHandler;

  inCache: InCache;

  ready: Promise<boolean>;

  actionGroups: Map<string, CloudActionGroup> = new Map();

  fetch: (request: Request) => Promise<Response> = this.#requestHandler.bind(
    this,
  );

  /* Serve stuff */

  get mode(): AppMode {
    return this.#mode;
  }

  /* End serve stuff */

  constructor(appName: N, options?: {
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
    config?: CloudConfig;
  }) {
    cloudLogger.info("starting");
    loadServeConfigFile();
    const mode = Deno.env.get("SERVE_MODE");
    switch (mode) {
      case "development":
      case "production":
        this.#mode = mode;
        break;
    }
    this.#extensionManager = new ExtensionManager();
    this.appName = appName;
    this.inCache = new InCache();
    this.api = new CloudAPI();

    this.actionGroups = new Map();

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
      orm: options?.builtInExtensions?.orm ?? true,
      auth: options?.builtInExtensions?.auth ?? true,
    };

    const appExtensions: Array<CloudExtension> = [
      baseExtension,
    ];
    if (builtInExtensions.auth) {
      appExtensions.push(authCloudExtension);
    }
    if (builtInExtensions.orm) {
      appExtensions.push(ormCloudExtension);
    }
    if (options?.appExtensions) {
      appExtensions.push(...options.appExtensions);
    }

    for (const appExtension of appExtensions) {
      this.#extensionManager.registerExtension(appExtension);
    }

    this.#setup();
    if (this.mode === "development") {
      const autoConfig = Deno.env.get("SERVE_AUTO_CONFIG");
      switch (autoConfig) {
        case "true":
        case "1":
        case "yes":
          serveLogger.info(
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

  #setup(): void {
    for (const extension of this.#extensionManager.extensions.values()) {
      this.#installExtension(extension);
    }
    this.#setupOrm();
  }

  #setupOrm() {
    const globalHooks: GlobalEntryHooks = {
      afterCreate: [],
      beforeCreate: [],
      beforeUpdate: [],
      afterUpdate: [],
      afterDelete: [],
      beforeDelete: [],
      beforeValidate: [],
      validate: [],
    };
    for (const hookName of Object.keys(this.#extensionManager.ormGlobalHooks)) {
      const hooks =
        this.#extensionManager.ormGlobalHooks[hookName as keyof AppEntryHooks];
      for (const hook of hooks) {
        const newHook: GlobalHookFunction = async (
          { entry, entryType, orm },
        ) => {
          return await hook(this, { entry, entryType, orm });
        };
        globalHooks[hookName as keyof GlobalEntryHooks].push(newHook);
      }
    }
    const config = this.#extensionManager.getExtensionConfig("orm");
    let connectionConfig: ClientConnectionType;
    const baseConnectionConfig = {
      user: config.dbUser || "postgres",
      database: config.dbName || "postgres",
      schema: config.dbSchema || "public",
    };

    switch (config.dbConnectionType) {
      case "tcp":
        connectionConfig = {
          ...baseConnectionConfig,
          connectionType: "tcp",
          host: config.dbHost,
          port: config.dbPort,
          password: config.dbPassword,
        };
        break;
      case "socket":
        connectionConfig = {
          ...baseConnectionConfig,
          connectionType: "socket",
          socketPath: config.dbSocketPath,
          password: config.dbPassword,
        };
        break;
      default:
        connectionConfig = {
          ...baseConnectionConfig,
          connectionType: "tcp",
          host: "localhost",
          port: 5432,
          password: "postgres",
          user: "postgres",
          database: "postgres",
        };
    }
    const dbConfig: DBConfig = {
      connection: connectionConfig,
      appName: config.dbAppName,
      clientMode: config.dbClientMode,
      idleTimeout: config.dbIdleTimeout,
      poolOptions: {
        idleTimeout: config.dbIdleTimeout,
        maxSize: config.dbMaxPoolSize,
        size: config.dbPoolSize,
        lazy: true,
      },
    };
    this.orm = new InSpatialORM({
      entries: Array.from(this.#extensionManager.entryTypes.values()),
      settings: Array.from(this.#extensionManager.settingsTypes.values()),
      globalEntryHooks: globalHooks,
      dbConfig,
    });
  }

  #installExtension(appExtension: CloudExtension): void {
    const config = this.#extensionManager.getExtensionConfig(appExtension.key);

    const { actionGroups } = appExtension;

    for (const actionGroup of actionGroups) {
      if (this.actionGroups.has(actionGroup.groupName)) {
        throw new Error(
          `Action group with name ${actionGroup.groupName} already exists`,
        );
      }
      this.actionGroups.set(actionGroup.groupName, actionGroup);
      const actions = new Map<string, ActionsAPIAction>();

      for (const action of actionGroup.actions) {
        if (action.includeInAPI === false) {
          continue;
        }
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
    const extensionObject = appExtension.install(this, config);
    this.#extensionObjects.set(appExtension.key, extensionObject);
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
    const group = this.actionGroups.get(gn);
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
  get installedExtensions(): Array<CloudExtensionInfo> {
    const installedExtensions = Array.from(
      this.#extensionManager.extensions.values(),
    );
    return installedExtensions.map((extension) => extension.info);
  }
  /**
   * Generates a serve-config_generated.json file in the current working directory based on the installed extensions.
   */
  generateConfigFile(): void {
    generateConfigSchema(this);
    generateServeConfigFile(this);
  }

  getExtensionConfig<T>(extensionKey: string): T {
    return this.#extensionManager.getExtensionConfig<T>(extensionKey);
  }
  getExtensionConfigValue<T>(extension: string, key: string): T {
    return this.#extensionManager.getExtensionConfigValue<T>(extension, key);
  }
  async #boot(): Promise<void> {
    await this.orm.db.init();
    for (const extension of this.#extensionManager.extensions.values()) {
      await extension.boot(this);
    }
    // await this.orm.init();
  }

  async run(): Promise<Deno.HttpServer<Deno.NetAddr>> {
    await this.ready;
    return this.#serve();
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

  /* Serve Stuff */

  #customProperties: Map<string, unknown> = new Map();
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

  #serve(): Deno.HttpServer<Deno.NetAddr> {
    return Deno.serve(
      {
        hostname: this.#config.hostname,
        port: this.#config.port,
      },
      this.#requestHandler.bind(this),
    );
  }
  async #requestHandler(request: Request): Promise<Response> {
    const inRequest = new InRequest(
      request,
    );
    for (const { handler } of this.#extensionManager.requestLifecycle.setup) {
      await handler(inRequest);
    }

    const inResponse = new InResponse();
    try {
      for (const middleware of this.#extensionManager.middlewares.values()) {
        console.log("middleware");
        const response = await middleware.handler(
          this,
          inRequest,
          inResponse,
        );

        if (response instanceof InResponse) {
          return response.respond();
        }
        if (response instanceof Response) {
          return response;
        }
      }

      if (inRequest.method === "OPTIONS") {
        return inResponse.respond();
      }

      const currentPath = inRequest.path;

      let pathHandler: PathHandler | undefined = this.#extensionManager
        .pathHandlers.get(
          currentPath,
        );
      if (!pathHandler) {
        const pathHandlers = Array.from(
          this.#extensionManager.pathHandlers.keys(),
        );
        for (const path of pathHandlers) {
          if (currentPath.startsWith(path)) {
            pathHandler = this.#extensionManager.pathHandlers.get(path);
            break;
          }
        }
      }

      if (pathHandler) {
        const response = await pathHandler.handler(
          this,
          inRequest,
          inResponse,
        );
        if (response instanceof InResponse) {
          return response.respond();
        }
        if (response instanceof Response) {
          return response;
        }
        if (response) {
          inResponse.setContent(response);
        }
      }
      return inResponse.respond();
    } catch (e) {
      return await this.#handleException(e, inResponse);
    }
  }

  async #handleException(
    err: unknown,
    inResponse: InResponse,
  ): Promise<Response> {
    inResponse = inResponse || new InResponse();
    inResponse;
    const clientMessages: Array<Record<string, any> | string> = [];
    let handled = false;
    for (const handler of this.#extensionManager.exceptionHandlers.values()) {
      const response = await handler.handler(err);
      if (!response || Object.keys(response).length === 0) {
        continue;
      }
      handled = true;
      if (response.clientMessage !== undefined) {
        clientMessages.push(response.clientMessage);
      }
      const { serverMessage } = response;
      if (serverMessage) {
        const { content, subject, type } = serverMessage;
        switch (type) {
          case "error":
            serveLogger.error(content, {
              subject,
              stackTrace: (err as Error).stack,
            });
            break;
          case "warning":
            serveLogger.warn(content, {
              subject,
            });
            break;
          case "info":
            serveLogger.info(content, {
              subject,
            });
            break;
          default:
            serveLogger.error(content, {
              subject,
            });
        }
      }
      if (response.status) {
        inResponse.errorStatus = response.status;
      }
      if (response.statusText) {
        inResponse.errorStatusText = response.statusText;
      }
    }
    if (!handled && isServerException(err)) {
      clientMessages.push(err.message);
      inResponse.errorStatus = err.status;
      inResponse.errorStatusText = err.name;
      let type: "error" | "warn" = "error";
      if (err.status >= 400 && err.status < 500) {
        type = "warn";
      }
      serveLogger[type](err.message, {
        subject: err.name,
        stackTrace: err.stack,
      });

      handled = true;
    }
    if (!handled && err instanceof Error) {
      serveLogger.error(`${err.message}: ${err.message}`, {
        subject: "Unknown Error",
        stackTrace: err.stack,
      });
      clientMessages.push("An unknown error occurred");
      inResponse.errorStatus = 500;
      inResponse.errorStatusText = "Internal Server Error";
      handled = true;
    }

    if (!handled) {
      serveLogger.error("An unknown error occurred", {
        subject: "Unknown Error",
        stackTrace: new Error().stack,
      });
      inResponse.errorStatus = 500;
      inResponse.errorStatusText = "Internal Server Error";
      clientMessages.push("An unknown error occurred");
      handled = true;
    }

    if (!inResponse.errorStatus) {
      inResponse.errorStatus = 500;
    }
    if (!inResponse.errorStatusText) {
      inResponse.errorStatusText = "Internal Server Error";
    }
    inResponse.setContent(clientMessages);
    return inResponse.error();
  }
}
