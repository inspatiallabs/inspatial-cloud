import { InRequest } from "#/in-request.ts";
import { assertResponse, InResponse } from "#/in-response.ts";
import type { PathHandler } from "#/extension/path-handler.ts";
import type { RequestExtension } from "#/extension/request-extension.ts";
import {
  ExceptionHandler,
  isServerException,
  tryCatchServerException,
} from "#/server-exception.ts";
import type { ExtensionMap, ServerExtensionInfo } from "#/extension/types.ts";
import type { ServerMiddleware } from "#/extension/server-middleware.ts";
import type { ServeConfig } from "#/types.ts";
import type { ConfigDefinition, ExtensionConfig } from "#/types.ts";
import {
  generateServeConfigFile,
  loadServeConfigFile,
} from "#/serve-config/serve-config.ts";
import type { ServerExtension } from "#/extension/server-extension.ts";
import { log } from "#log";

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
  fetch: (request: Request) => Promise<Response> = this.#requestHandler.bind(
    this,
  );

  /**
   * The request extensions that have been added to the server.
   * These are used to modify the InRequest object before it's used in further middleware or request handling.
   */
  #requestExtensions: Map<string, RequestExtension> = new Map();
  #exceptionHandlers: Map<string, ExceptionHandler> = new Map();

  get #defaultPathHandler(): ServerMiddleware | undefined {
    return this.#config?.defaultPathHandler;
  }

  #middlewares: Map<string, ServerMiddleware> = new Map();
  #pathHandlers: Map<string, PathHandler> = new Map();

  #customProperties: Map<string, unknown> = new Map();

  #extensions: Map<
    string,
    any
  > = new Map();

  #extensionsConfig: Map<string, Map<string, any>> = new Map();

  #config: ServeConfig = {
    hostname: undefined,
    port: undefined,
    extensions: [],
  };
  #installedExtensions: Set<any> = new Set();

  /**
   * The installed extensions that have been added to the server.
   */
  get installedExtensions(): ServerExtensionInfo[] {
    return Array.from(this.#installedExtensions);
  }

  addCustomProperty(prop: {
    key: string;
    description: string;
    value: unknown;
  }) {
    Object.defineProperty(this, prop.key, {
      get: () => this.#customProperties.get(prop.key),

      enumerable: true,
    });

    this.#customProperties.set(prop.key, prop.value);
  }

  getCustomProperty<T>(key: string): T | undefined {
    return this.#customProperties.get(key) as T;
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
      await server.#installExtension(extension);
    }

    return server;
  }
  constructor(config: C) {
    if (config) {
      this.#config = config;
    }
    loadServeConfigFile();
    for (const extension of config?.extensions || []) {
      this.#installExtension(extension);
    }
    if (this.#exceptionHandlers.size === 0) {
      this.#addExceptionHandler({
        name: "default",
        handler: (serverException) => {
          log.warn({
            error: serverException.message,
            status: serverException.status,
          });
        },
      });
    }
    if (Deno.env.has("SERVE_PORT")) {
      this.#config.port = Number(Deno.env.get("SERVE_PORT"));
    }
    if (Deno.env.has("SERVE_HOSTNAME")) {
      this.#config.hostname = Deno.env.get("SERVE_HOSTNAME");
    }
    this.fetch.bind(this);
  }
  /**
   * Adds an extension to the `InRequest` class.
   * This can be used to add custom functionality to the the request object
   * before it's used in further middleware or request handling.
   */
  #extendRequest(extension: RequestExtension) {
    if (this.#requestExtensions.has(extension.name)) {
      throw new Error(
        `Request extension with name ${extension.name} already exists`,
      );
    }
    this.#requestExtensions.set(extension.name, extension);
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
  #addMiddleware(middleware: ServerMiddleware) {
    if (this.#middlewares.has(middleware.name)) {
      throw new Error(
        `Middleware with name ${middleware.name} already exists`,
      );
    }
    this.#middlewares.set(middleware.name, middleware);
  }

  #addExceptionHandler(handler: ExceptionHandler) {
    if (this.#exceptionHandlers.has(handler.name)) {
      throw new Error(
        `Exception handler with name ${handler.name} already exists`,
      );
    }
    this.#exceptionHandlers.set(handler.name, handler);
  }

  /**
   * Adds a handler for a path.
   * This is used to define a handler for a specific path.
   */
  #addPathHandler(handler: PathHandler) {
    const paths = Array.isArray(handler.path) ? handler.path : [handler.path];
    for (const path of paths) {
      if (this.#pathHandlers.has(path)) {
        throw new Error(`Path handler for path ${path} already exists`);
      }
      this.#pathHandlers.set(path, handler);
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
    const config = this.#extensionsConfig.get(extension);
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
    const config = this.#extensionsConfig.get(extension);
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
    const config = this.#extensionsConfig.get(extension);
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
    return this.#extensions.get(name as string) as R[N];
  }

  async generateConfigFile() {
    await generateServeConfigFile(this);
  }
  #setupExtensionConfig(
    extension: ServerExtension<string, any>,
  ) {
    this.#extensionsConfig.set(extension.name, new Map());
    const configDefinition = extension.config;
    if (!configDefinition) {
      return;
    }

    for (const key in configDefinition) {
      const def = configDefinition[key];
      const envKey = def.env!;
      log.debug(envKey);
      const value = Deno.env.get(envKey) ||
        this.getExtensionConfigValue(extension.name, key) || def.default;
      if (def.required && value === undefined) {
        console.warn(`Missing required environment variable ${envKey}`);
      }
      if (value === undefined) {
        continue;
      }
      switch (def.type) {
        case "string[]":
          try {
            let arr: string[] = [];
            if (typeof value === "string") {
              arr = value.replaceAll(/[\[\]]/g, "").split(",").map((v) =>
                v.trim()
              );
            }
            if (Array.isArray(value)) {
              arr = value;
            }
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
          let boolValue = false;
          switch (typeof value) {
            case "string":
              if (trueValues.includes(value)) {
                boolValue = true;
              }
              if (falseValues.includes(value)) {
                boolValue = false;
              }
              break;
            case "number":
              boolValue = value === 1;
              break;
            case "boolean":
              boolValue = value;
              break;
          }

          this.setExtensionConfigValue(extension.name, key, boolValue);
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

  #installExtension<
    C extends ConfigDefinition,
    E extends ServerExtension<string, any>,
  >(
    extension: E,
  ): E extends ServerExtension<string, infer R> ? R : void {
    for (const requestExtension of extension.requestExtensions) {
      this.#extendRequest(requestExtension);
    }
    for (const middleware of extension.middleware) {
      this.#addMiddleware(middleware);
    }
    for (const pathHandler of extension.pathHandlers) {
      this.#addPathHandler(pathHandler);
    }

    for (const exceptionHandler of extension.exceptionHandlers) {
      this.#addExceptionHandler(exceptionHandler);
    }

    this.#setupExtensionConfig(extension);
    this.#addExtensionInfo(extension);
    const config = this.getExtensionConfig(extension.name);
    const extensionObject = extension.install(this, config);
    if (extensionObject) {
      this.#extensions.set(extension.name, extensionObject);
    }
    return extensionObject;
  }

  /**
   * Adds information about the installed extension.
   */
  #addExtensionInfo(extension: ServerExtension<any, any>) {
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
    this.#installedExtensions.add({
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
    return this.#serve();
  }

  #handleException(
    err: unknown,
    inResponse?: InResponse,
  ) {
    inResponse = inResponse || new InResponse();
    if (isServerException(err)) {
      for (const handler of this.#exceptionHandlers.values()) {
        handler.handler(err);
      }
      return inResponse.error(err.message, err.status);
    }

    if (err instanceof Error) {
      log.error(err.message);
    }
    // console.error(err);
    return inResponse.error("Internal server error", 500);
  }
  async #requestHandler(request: Request): Promise<Response> {
    try {
      const inRequest = new InRequest(
        request,
      );

      for (const extension of this.#requestExtensions.values()) {
        extension.handler(inRequest);
      }

      const inResponse = new InResponse();

      for (const middleware of this.#middlewares.values()) {
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

      let pathHandler: PathHandler | undefined = this.#pathHandlers.get(
        currentPath,
      );
      if (!pathHandler) {
        const pathHandlers = Array.from(this.#pathHandlers.keys());
        for (const path of pathHandlers) {
          if (currentPath.startsWith(path)) {
            pathHandler = this.#pathHandlers.get(path);
            break;
          }
        }
      }

      if (!pathHandler && this.#defaultPathHandler) {
        const response = this.#defaultPathHandler.handler(
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
      }
      return inResponse.respond();
    } catch (e) {
      return this.#handleException(e, undefined);
    }
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
}
