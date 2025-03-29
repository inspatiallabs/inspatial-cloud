import { InRequest } from "#/in-request.ts";
import { InResponse } from "#/in-response.ts";
import type { HandlerResponse, PathHandler } from "#/extension/path-handler.ts";
import { isServerException, raiseServerException } from "#/server-exception.ts";
import type { ExtensionMap, ServerExtensionInfo } from "#/extension/types.ts";
import type { ServerMiddleware } from "#/extension/server-middleware.ts";
import type { ExceptionHandler, ServeConfig } from "#/types.ts";
import type { ConfigDefinition } from "#/types.ts";
import {
  generateServeConfigFile,
  loadServeConfigFile,
} from "#/serve-config/serve-config.ts";
import type { ServerExtension } from "#/extension/server-extension.ts";
import { serveLogger } from "#/logger/serve-logger.ts";

class ServePathHandler {
  name: string;
  description: string;
  path: string | Array<string>;
  handler: (
    server: InSpatialServer,
    inRequest: InRequest,
    inResponse: InResponse,
  ) =>
    | Promise<HandlerResponse>
    | HandlerResponse;

  constructor(
    name: string,
    description: string,
    path: string | Array<string>,
    handler: (
      server: InSpatialServer,
      inRequest: InRequest,
      inResponse: InResponse,
    ) =>
      | Promise<HandlerResponse>
      | HandlerResponse,
  ) {
    this.name = name;
    this.description = description;
    this.path = path;
    this.handler = handler;
  }
}

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

  #requestLifecycle: {
    setup: Array<{
      name: string;
      description?: string;
      handler: (inRequest: InRequest) => Promise<void> | void;
    }>;
    cleanup: Array<{
      name: string;
      description?: string;
      handler: (inRequest: InRequest) => Promise<void> | void;
    }>;
  };

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

  /**
   * Creates a new InSpatialServer instance.
   * @param config The configuration for the server.
   * @example
   * ```ts
   * import { InSpatialServer } from "@inspatial/serve";
   *
   * const server = new InSpatialServer({
   *  extensions: [], // add extensions here
   * });
   * ```
   */
  constructor(config: C) {
    if (config) {
      this.#config = config;
    }
    loadServeConfigFile();
    this.#requestLifecycle = {
      setup: [],
      cleanup: [],
    };
    for (const extension of config?.extensions || []) {
      this.#installExtension(extension);
    }
    if (this.#exceptionHandlers.size === 0) {
      this.#addExceptionHandler({
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
    if (Deno.env.has("SERVE_PORT")) {
      this.#config.port = Number(Deno.env.get("SERVE_PORT"));
    }
    if (Deno.env.has("SERVE_HOSTNAME")) {
      this.#config.hostname = Deno.env.get("SERVE_HOSTNAME");
    }
    this.fetch.bind(this);
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
  #addMiddleware(middleware: ServerMiddleware): void {
    if (this.#middlewares.has(middleware.name)) {
      throw new Error(
        `Middleware with name ${middleware.name} already exists`,
      );
    }
    this.#middlewares.set(middleware.name, middleware);
  }

  #addExceptionHandler(handler: ExceptionHandler): void {
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
  #addPathHandler(handler: PathHandler): void {
    const paths = Array.isArray(handler.path) ? handler.path : [handler.path];
    for (const path of paths) {
      if (this.#pathHandlers.has(path)) {
        throw new Error(`Path handler for path ${path} already exists`);
      }
      const handlerInstance = new ServePathHandler(
        handler.name,
        handler.description,
        path,
        handler.handler,
      );
      this.#pathHandlers.set(path, handlerInstance);
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
  ): void {
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

  /**
   * Generates a serve-config_generated.json file in the current working directory based on the installed extensions.
   */
  async generateConfigFile(): Promise<void> {
    await generateServeConfigFile(this);
  }
  #setupExtensionConfig(
    extension: ServerExtension<string, any>,
  ): void {
    this.#extensionsConfig.set(extension.name, new Map());
    const configDefinition = extension.config;
    if (!configDefinition) {
      return;
    }

    for (const key in configDefinition) {
      const def = configDefinition[key];
      const envKey = def.env!;
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
    this.#setupExtensionConfig(extension);
    if (extension.requestLifecycle) {
      for (const setup of extension.requestLifecycle.setup) {
        const config = this.getExtensionConfig(extension.name);

        this.#requestLifecycle.setup.push({
          ...setup,
          handler: (inRequest: InRequest) => {
            return setup.handler(inRequest, config);
          },
        });
      }
      for (const cleanup of extension.requestLifecycle.cleanup) {
        this.#requestLifecycle.cleanup.push({
          ...cleanup,
          handler: (inRequest: InRequest) => {
            return cleanup.handler(
              inRequest,
              this.getExtensionConfig(extension.name),
            );
          },
        });
      }
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
  #addExtensionInfo(extension: ServerExtension<any, any>): void {
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

    const lifecycleSetupHandlers =
      extension.requestLifecycle?.setup.map((l) => {
        return {
          name: l.name,
          description: l.description,
        };
      }) || [];

    const lifecycleCleanupHandlers =
      extension.requestLifecycle?.cleanup.map((l) => {
        return {
          name: l.name,
          description: l.description,
        };
      }) || [];
    this.#installedExtensions.add({
      name: extension.name,
      config: extension.config,
      description: extension.description,
      middleware,
      pathHandlers,
      lifecycleSetupHandlers,
      lifecycleCleanupHandlers,
    });
  }
  /**
   * The main entry point for the server. This method is an alternative to `deno serve`.
   *
   * @example
   * ```ts
   * import { InSpatialServer } from "@inspatial/serve";
   *
   * const server = new InSpatialServer({
   *  extensions:[] // add extensions here
   * });
   *
   * server.run();
   * ```
   */
  run(): Deno.HttpServer<Deno.NetAddr> {
    return this.#serve();
  }

  async #handleException(
    err: unknown,
    inResponse: InResponse,
  ): Promise<Response> {
    inResponse = inResponse || new InResponse();
    inResponse;
    const clientMessages: Array<Record<string, any> | string> = [];
    let handled = false;
    for (const handler of this.#exceptionHandlers.values()) {
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
  async #requestHandler(request: Request): Promise<Response> {
    const inRequest = new InRequest(
      request,
    );

    for (const { handler } of this.#requestLifecycle.setup) {
      await handler(inRequest);
    }

    const inResponse = new InResponse();
    try {
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
      return await this.#handleException(e, inResponse);
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
