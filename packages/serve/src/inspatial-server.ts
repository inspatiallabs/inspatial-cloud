import { InRequest } from "#/in-request.ts";
import { InResponse } from "#/in-response.ts";
import type { PathHandler } from "#/extension/path-handler.ts";
import type { RequestExtension } from "#/extension/request-extension.ts";
import { isServerException } from "#/server-exception.ts";
import type { ExtensionMap, ServerExtensionInfo } from "#/extension/types.ts";
import type { ServerMiddleware } from "#/extension/server-middleware.ts";
import type { ServeConfig } from "#/types.ts";
import type { ConfigDefinition, ExtensionConfig } from "#/types.ts";
import { loadServeConfigFile } from "#/serve-config/serve-config.ts";
import type { ServerExtension } from "#/extension/server-extension.ts";

/**
 * The main server class.
 * This is used to create a new server instance.
 *
 * @example
 * ```ts
 * import { InSpatialServer } from "@inspatial/serve";
 *
 * const server = await InSpatialServer.create({
 *   extensions: [apiExtension, corsExtension, realtimeExtension],
 * });
 *
 * export default server;
 * ```
 * @module
 */

export class InSpatialServer<
  C extends ServeConfig = ServeConfig,
> {
  /**
   * This fetch method is not intended to be called directly. It's purpose is so that the InSpatialServer instance can be exported as the default
   * and the `deno serve` command can be used to run the server.
   *
   * This is useful when self hosting the server and you want to run parallel processes.
   *
   * @example
   * ```ts
   * import { InSpatialServer } from "#serve";
   *
   * const server = new InSpatialServer();
   *
   * // install extensions and middleware
   *
   * export default server;
   *
   * ```
   *
   * Then in the terminal:
   *
   * ```sh
   * deno serve main.ts
   * ```
   *
   * or for running parallel processes:
   * ```sh
   * deno serve --parallel main.ts
   * ```
   */
  fetch: (request: Request) => Promise<Response> = this._requestHandler.bind(
    this,
  );

  /**
   * The request extensions that have been added to the server.
   * These are used to modify the InRequest object before it's used in further middleware or request handling.
   */
  private _requestExtensions: Map<string, RequestExtension> = new Map();

  private get _defaultPathHandler(): ServerMiddleware | undefined {
    return this._config?.defaultPathHandler;
  }

  private _middlewares: Map<string, ServerMiddleware> = new Map();
  private _pathHandlers: Map<string, PathHandler> = new Map();

  private _customProperties: Map<string, unknown> = new Map();

  private _extensions: Map<
    string,
    any
  > = new Map();

  private _extensionsConfig: Map<string, Map<string, any>> = new Map();

  private _config: ServeConfig = {
    hostname: undefined,
    port: undefined,
    extensions: [],
  };
  private _installedExtensions: Set<any> = new Set();

  /**
   * The installed extensions that have been added to the server.
   */
  get installedExtensions(): ServerExtensionInfo[] {
    return Array.from(this._installedExtensions);
  }

  addCustomProperty(prop: {
    key: string;
    description: string;
    value: unknown;
  }) {
    Object.defineProperty(this, prop.key, {
      get: () => this._customProperties.get(prop.key),

      enumerable: true,
    });

    this._customProperties.set(prop.key, prop.value);
  }

  getCustomProperty<T>(key: string): T | undefined {
    return this._customProperties.get(key) as T;
  }

  /**
   * Creates a new InSpatialServer instance.
   * @param config {ServeConfig} The configuration for the server
   * @returns {Promise<InSpatialServer>} The InSpatialServer instance
   */
  static async create<
    C extends ServeConfig,
  >(
    config: C extends ServeConfig<infer EL> ? C : ServeConfig,
  ): Promise<
    InSpatialServer<C>
  > {
    loadServeConfigFile();
    const server = new InSpatialServer(config) as InSpatialServer<C>;
    for (const extension of config?.extensions || []) {
      await server.installExtension(extension);
    }

    return server;
  }
  constructor(config: C) {
    if (config) {
      this._config = config;
    }
    loadServeConfigFile();
    for (const extension of config?.extensions || []) {
      this.installExtension(extension);
    }
    if (Deno.env.has("SERVE_PORT")) {
      this._config.port = Number(Deno.env.get("SERVE_PORT"));
    }
    if (Deno.env.has("SERVE_HOSTNAME")) {
      this._config.hostname = Deno.env.get("SERVE_HOSTNAME");
    }
    this.fetch.bind(this);
  }
  /**
   * Adds an extension to the `InRequest` class.
   * This can be used to add custom functionality to the the request object
   * before it's used in further middleware or request handling.
   */
  private extendRequest(extension: RequestExtension) {
    if (this._requestExtensions.has(extension.name)) {
      throw new Error(
        `Request extension with name ${extension.name} already exists`,
      );
    }
    this._requestExtensions.set(extension.name, extension);
  }

  /**
   * Adds a middleware to the server.
   * Middleware are functions that are called before the request is handled.
   * A common use case for middleware is to add authentication or logging to the server.
   *
   * Middleware can be async and can modify the request and response objects.
   *
   * If a middleware returns a response, the response will be sent to the client immediately,
   * skipping any further middleware or request handling.
   */
  private addMiddleware(middleware: ServerMiddleware) {
    if (this._middlewares.has(middleware.name)) {
      throw new Error(
        `Middleware with name ${middleware.name} already exists`,
      );
    }
    this._middlewares.set(middleware.name, middleware);
  }

  /**
   * Adds a handler for a path.
   * This is used to define a handler for a specific path.
   */
  private addPathHandler(handler: PathHandler) {
    const paths = Array.isArray(handler.path) ? handler.path : [handler.path];
    for (const path of paths) {
      if (this._pathHandlers.has(path)) {
        throw new Error(`Path handler for path ${path} already exists`);
      }
      this._pathHandlers.set(path, handler);
    }
  }

  /**
   * Sets the configuration value for a given key in an extension.
   *
   * @param extension {string} The name of the extension
   * @param key {string} The key of the configuration value
   * @param value {unknown} The value to set
   */
  setExtensionConfigValue(
    extension: string,
    key: string,
    value: unknown,
  ) {
    const config = this._extensionsConfig.get(extension);
    if (!config) {
      throw new Error(`Extension ${extension} not found`);
    }
    if (Array.isArray(value)) {
      value = new Set(value);
    }
    config.set(key, value);
  }

  /**
   * Gets the configuration value for a given key in an extension.
   *
   * @param extension {string} The name of the extension
   * @param key {string} The key of the configuration value
   */
  getExtensionConfigValue<T = any>(
    extension: string,
    key: string,
  ): T {
    const config = this._extensionsConfig.get(extension);
    if (!config) {
      throw new Error(`Extension ${extension} not found`);
    }
    const value = config.get(key);

    return value;
  }

  /**
   * Gets the configuration for a given extension.
   *
   * @param extension {string} The name of the extension
   */
  getExtensionConfig<T = Record<string, any>>(extension: string): T {
    const config = this._extensionsConfig.get(extension);
    if (config === undefined) {
      throw new Error(`Extension ${extension} not found`);
    }
    return Object.fromEntries(config) as T;
  }

  /**
   * Gets the extension object for a given extension.
   *
   * @param name {string} The name of the extension
   */
  getExtension<R extends ExtensionMap<C>, N extends keyof R>(
    name: N,
  ): R[N] {
    return this._extensions.get(name as string) as R[N];
  }
  private setupExtensionConfig(
    extension: ServerExtension<string, any>,
    config?: ExtensionConfig<any>,
  ) {
    this._extensionsConfig.set(extension.name, new Map());
    const configDefinition = extension.config;
    if (!configDefinition) {
      return;
    }
    if (config) {
      for (const key in config) {
        if (!configDefinition[key]) {
          continue;
        }
        this.setExtensionConfigValue(extension.name, key, config[key]);
      }
    }

    for (const key in configDefinition) {
      const def = configDefinition[key];
      const envKey = extension.envPrefix
        ? `${extension.envPrefix}_${def.env}`
        : def.env!;
      const value = Deno.env.get(envKey) ||
        this.getExtensionConfigValue(extension.name, key) || def.default;
      if (def.required && !value) {
        console.warn(`Missing required environment variable ${envKey}`);
      }
      if (value === undefined) {
        continue;
      }
      switch (def.type) {
        case "string[]":
          try {
            const arr = value.replaceAll(/[\[\]]/g, "").split(",").map((v) =>
              v.trim()
            );
            this.setExtensionConfigValue(extension.name, key, arr);
          } catch (e) {
            console.error(e);
          }
          break;
        case "number":
          this.setExtensionConfigValue(extension.name, key, Number(value));
          break;
        case "boolean": {
          const trueValues = ["true", "1", "yes"];
          const falseValues = ["false", "0", "no"];
          if (trueValues.includes(value)) {
            this.setExtensionConfigValue(extension.name, key, true);
            continue;
          }
          if (falseValues.includes(value)) {
            this.setExtensionConfigValue(extension.name, key, false);
          }

          break;
        }
        default:
          this.setExtensionConfigValue(extension.name, key, value);
      }
    }
  }
  /**
   * Installs a server extension.
   * This is used to add custom functionality to the server.
   */

  private installExtension<
    C extends ConfigDefinition,
    E extends ServerExtension<string, any>,
  >(
    extension: E,
    config?: ExtensionConfig<C>,
  ): E extends ServerExtension<string, infer R> ? R : void {
    if (extension.requestExtensions) {
      for (const requestExtension of extension.requestExtensions) {
        this.extendRequest(requestExtension);
      }
    }
    if (extension.middleware) {
      for (const middleware of extension.middleware) {
        this.addMiddleware(middleware);
      }
    }
    if (extension.pathHandlers) {
      for (const pathHandler of extension.pathHandlers) {
        this.addPathHandler(pathHandler);
      }
    }

    this.setupExtensionConfig(extension, config);
    this.addExtensionInfo(extension);
    const extensionObject = extension.install(this);
    if (extensionObject) {
      this._extensions.set(extension.name, extensionObject);
    }
    return extensionObject;
  }

  /**
   * Adds information about the installed extension.
   */
  private addExtensionInfo(extension: ServerExtension<any, any>) {
    const middleware = extension.middleware?.map((m) => {
      return {
        name: m.name,
        description: m.description,
      };
    }) || [];

    const pathHandlers = extension.pathHandlers?.map((p) => {
      return {
        name: p.name,
        path: p.path,
        description: p.description,
      };
    }) || [];

    const requestExtensions = extension.requestExtensions?.map((r) => {
      return {
        name: r.name,
        description: r.description,
      };
    }) || [];
    this._installedExtensions.add({
      name: extension.name,
      config: extension.config,
      description: extension.description,
      middleware,
      pathHandlers,
      requestExtensions,
    });
  }
  /**
   * The main entry point for the server.
   */
  run(): Deno.HttpServer<Deno.NetAddr> {
    return this.serve();
  }

  private async _requestHandler(request: Request): Promise<Response> {
    const inRequest = new InRequest(
      request,
    );

    for (const extension of this._requestExtensions.values()) {
      extension.handler(inRequest);
    }

    const inResponse = new InResponse();

    for (const middleware of this._middlewares.values()) {
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

    let pathHandler: PathHandler | undefined = this._pathHandlers.get(
      currentPath,
    );
    if (!pathHandler) {
      const pathHandlers = Array.from(this._pathHandlers.keys());
      for (const path of pathHandlers) {
        if (currentPath.startsWith(path)) {
          pathHandler = this._pathHandlers.get(path);
          break;
        }
      }
    }

    if (!pathHandler && this._defaultPathHandler) {
      const response = this._defaultPathHandler.handler(
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

    if (pathHandler) {
      try {
        const response = await pathHandler.handler(
          this,
          inRequest,
          inResponse,
        );
        if (response instanceof InResponse) {
          return response.respond();
        }
        if (response) {
          inResponse.setContent(response);
        }
      } catch (error) {
        if (isServerException(error)) {
          return inResponse.error(error.message, error.status);
        }
        console.error(error);
        return inResponse.error(
          "An error occurred while processing the request",
          500,
        );
      }
    }
    return inResponse.respond();
  }
  private serve(): Deno.HttpServer<Deno.NetAddr> {
    return Deno.serve(
      {
        hostname: this._config.hostname,
        port: this._config.port,
      },
      this._requestHandler.bind(this),
    );
  }
}
