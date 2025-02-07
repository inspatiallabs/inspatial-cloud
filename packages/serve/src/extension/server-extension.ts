import type { ConfigDefinition, ExtensionConfig } from "#/types.ts";
import type { ServerMiddleware } from "#/extension/server-middleware.ts";
import type { PathHandler } from "#/extension/path-handler.ts";
import type { InSpatialServer } from "#/inspatial-server.ts";
import type { ExceptionHandler } from "#/server-exception.ts";
import type { RequestLifecycle } from "#/extension/request-lifecycle.ts";
import { camelToSnakeCase } from "#/utils/string-utils.ts";

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
  readonly requestLifecycle: RequestLifecycle;
  readonly middleware: ServerMiddleware[];
  readonly pathHandlers: PathHandler[];
  readonly exceptionHandlers: ExceptionHandler[];
  install: (server: InSpatialServer, config: ExtensionConfig<C>) => R;
  /**
   * Creates a new ServerExtension
   */
  constructor(name: N, options: {
    /** A brief description of the extension */
    description: string;

    config?: C;
    /** The lifecycle handlers for the incoming requests. */
    requestLifecycle?: Partial<RequestLifecycle>;
    /** Request middleware */
    middleware?: ServerMiddleware[];

    /** Path handlers */
    pathHandlers?: PathHandler[];
    /** Exception handlers */
    exceptionHandlers?: ExceptionHandler[];

    /** The main install function to set up the extension. The loaded config
     * values are passed to the install function
     */
    install: (server: InSpatialServer, config: ExtensionConfig<C>) => R;
  }) {
    this.name = name;
    this.config = options.config;
    this.description = options.description;
    this.requestLifecycle = {
      setup: options.requestLifecycle?.setup || [],
      cleanup: options.requestLifecycle?.cleanup || [],
    };
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
