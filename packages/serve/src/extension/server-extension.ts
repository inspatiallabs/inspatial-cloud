import type { ConfigDefinition, ExtensionConfig } from "#/types.ts";
import type { RequestExtension } from "#/extension/request-extension.ts";
import type { ServerMiddleware } from "#/extension/server-middleware.ts";
import type { PathHandler } from "#/extension/path-handler.ts";
import type { InSpatialServer } from "#/inspatial-server.ts";
import type { ExceptionHandler } from "#/server-exception.ts";
import { camelToSnakeCase } from "#utils";

/**
 * An extension for InSpatialServer.
 */
export class ServerExtension<
  N extends string = string,
  R = any,
  C extends ConfigDefinition = ConfigDefinition,
> {
  readonly name: N;
  config?: C;
  readonly description: string;
  readonly requestExtensions: RequestExtension[];
  readonly middleware: ServerMiddleware[];
  readonly pathHandlers: PathHandler[];
  readonly exceptionHandlers: ExceptionHandler[];
  install: (server: InSpatialServer, config: ExtensionConfig<C>) => R;
  /**
   * Creates a new ServerExtension
   *
   * @param name The name of the extension.
   * @param options The options for the extension.
   */
  constructor(name: N, options: {
    description: string;
    envPrefix?: string;
    config?: C;
    requestExtensions?: RequestExtension[];
    middleware?: ServerMiddleware[];
    pathHandlers?: PathHandler[];
    exceptionHandlers?: ExceptionHandler[];
    install: (server: InSpatialServer, config: ExtensionConfig<C>) => R;
  }) {
    this.name = name;
    this.config = options.config;
    this.description = options.description;
    this.requestExtensions = options.requestExtensions || [];
    this.middleware = options.middleware || [];
    this.pathHandlers = options.pathHandlers || [];
    this.exceptionHandlers = options.exceptionHandlers || [];

    this.install = options.install;
    this.#validateConfigEnv();
  }

  #validateConfigEnv() {
    if (!this.config) return;
    for (const key in this.config) {
      const configDef = this.config[key];
      if (!configDef.env) {
        this.config[key].env = camelToSnakeCase(key).toUpperCase();
      }
    }
  }
}
