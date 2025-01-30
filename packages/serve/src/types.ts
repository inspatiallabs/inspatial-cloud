import type { ServerExtension } from "#/extension/server-extension.ts";
import type { ServerMiddleware } from "#/extension/server-middleware.ts";

/**
 * Configuration for InSpatialServer.
 */
export interface ServeConfig<
  EL extends Array<ServerExtension<string, any>> = Array<
    ServerExtension<string, any>
  >,
> {
  /**
   * The hostname to listen on.
   * If not provided, the server will listen on all available interfaces.
   *
   * @example
   * `localhost` or `127.0.0.1`
   */
  hostname?: string;

  /**
   * The port to listen on.
   * If not provided, the server will listen on port `8000`.
   *
   * @example
   * `8080`
   */
  port?: number;

  extensions: EL extends Array<ServerExtension<infer N, infer R>>
    ? Array<ServerExtension<N, R>>
    : EL;

  defaultPathHandler?: ServerMiddleware;
}

export type ConfigEnv<
  T extends keyof ConfigEnvTypeMap = keyof ConfigEnvTypeMap,
> = {
  env?: string;
  description: string;
  required?: boolean;
  default?: string;
  type: T;
};

interface ConfigEnvTypeMap {
  string: string;
  number: number;
  boolean: boolean;
  "string[]": string[];
}

export type ExtractConfigEnvValue<C extends ConfigEnv> = C extends
  ConfigEnv<infer T> ? ConfigEnvTypeMap[T]
  : never;

export type ExtensionConfig<C extends ConfigDefinition> = C extends
  ConfigDefinition<infer K> ? {
    [P in K]: ExtractConfigEnvValue<C[P]>;
  }
  : never;

export type ConfigDefinition<K extends string = string> = Record<K, ConfigEnv>;
