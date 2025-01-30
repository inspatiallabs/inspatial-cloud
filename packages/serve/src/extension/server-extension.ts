import type { ConfigDefinition } from "#/types.ts";
import type { RequestExtension } from "#/extension/request-extension.ts";
import type { ServerMiddleware } from "#/extension/server-middleware.ts";
import type { PathHandler } from "#/extension/path-handler.ts";
import type { InSpatialServer } from "#/inspatial-server.ts";

/**
 * An extension for InSpatialServer.
 */
export class ServerExtension<N extends string, R> {
  readonly name: N;
  envPrefix?: string;
  config?: ConfigDefinition;
  readonly description: string;
  readonly requestExtensions: RequestExtension[];
  readonly middleware: ServerMiddleware[];
  readonly pathHandlers: PathHandler[];
  install: (server: InSpatialServer) => R;
  /**
   * Creates a new ServerExtension
   *
   * @param name The name of the extension.
   * @param options The options for the extension.
   */
  static create<
    N extends string,
    I extends (server: InSpatialServer) => any,
  >(
    name: N,
    options: {
      description: string;
      envPrefix?: string;
      config?: ConfigDefinition;
      requestExtensions?: RequestExtension[];
      middleware?: ServerMiddleware[];
      pathHandlers?: PathHandler[];
      install: I;
    },
  ): ServerExtension<N, ReturnType<I>> {
    return new ServerExtension(name, options);
  }
  private constructor(name: N, options: {
    description: string;
    envPrefix?: string;
    config?: ConfigDefinition;
    requestExtensions?: RequestExtension[];
    middleware?: ServerMiddleware[];
    pathHandlers?: PathHandler[];
    install: (server: InSpatialServer) => R;
  }) {
    this.name = name;
    this.envPrefix = options.envPrefix;
    this.config = options.config;
    this.description = options.description;
    this.requestExtensions = options.requestExtensions || [];
    this.middleware = options.middleware || [];
    this.pathHandlers = options.pathHandlers || [];
    this.install = options.install;
  }
}
