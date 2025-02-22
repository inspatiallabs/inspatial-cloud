import type { ServerExtension } from "#/extension/server-extension.ts";
import type { ServerMiddleware } from "#/extension/server-middleware.ts";
import { LogType } from "../mod.ts";

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

  /**
   * The server extensions to install.
   */
  extensions: EL extends Array<ServerExtension<infer N, infer R>>
    ? Array<ServerExtension<N, R>>
    : EL;
  /**
   * Set the default path handler for the server.
   * This handler will be called if no other path handler is found for the request.
   */
  defaultPathHandler?: ServerMiddleware;
}

/**
 * The configuration for an environment variable.
 */
export type ConfigEnv<
  T extends keyof ConfigEnvTypeMap = keyof ConfigEnvTypeMap,
> = {
  env?: string;
  description: string;
  required?: boolean;
  default?: ConfigEnvTypeMap[T];
  type: T;
};

/**
 * The type map for the ConfigEnv type definition.
 */
export interface ConfigEnvTypeMap {
  /**
   * A 'string' type.
   */
  string: string;

  /**
   * A 'number' type.
   */
  number: number;

  /**
   * A 'boolean' type.
   */
  boolean: boolean;

  /**
   * An array of 'string' type.
   */
  "string[]": string[];
}

/**
 * Extract the value type from a ConfigEnv definition.
 */
export type ExtractConfigEnvValue<C extends ConfigEnv> = C extends
  ConfigEnv<infer T> ? ConfigEnvTypeMap[T]
  : never;

/**
 * The configuration values for the extension.
 */
export type ExtensionConfig<C extends ConfigDefinition> = C extends
  ConfigDefinition<infer K> ? {
    [P in K]: ExtractConfigEnvValue<C[P]>;
  }
  : never;

/**
 * The definition configuration of the environment variables for the extension.
 */
export type ConfigDefinition<K extends string = string> = Record<K, ConfigEnv>;

/**
 * The HTTP request method.
 */
export type RequestMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "OPTIONS"
  | "HEAD"
  | "CONNECT"
  | "TRACE";

/**
 * Exception handler function signature.
 * @param error The error that was thrown by the server
 * @returns An {@link ExceptionHandlerResponse} with a `clientMessage` and a `serverMessage`
 *
 * You can return a string or an object for both  the clientMessage and serverMessage.
 *
 * The `clientMessage` is the message that will be sent to the client in the response body
 * and should not contain any sensitive information.
 *
 * The `serverMessage` is the message that will be logged by the server.
 *
 * @example
 * ```ts
 * const handler: ExceptionHandler = {
 *  name: "My Exception Handler",
 *  handler: (error) => {
 *    if(error instanceof MyCustomError){
 *
 *      return {
 *        clientMessage: "A custom error occurred",
 *        serverMessage: {
 *          error: "My app broke again",
 *          details: error.details
 *        }
 *      }
 *    }
 *  }
 * ```
 */
export type ExceptionHandler = {
  name: string;
  description?: string;
  handler: (
    error: unknown,
  ) =>
    | ExceptionHandlerResponse
    | void
    | Promise<ExceptionHandlerResponse | void>;
};

/**
 * The response object returned by {@link ExceptionHandler} functions
 */
export interface ExceptionHandlerResponse {
  /**
   * The message to send to the client
   */
  clientMessage?: Record<string, any> | string;

  /**
   * The message to log on the server
   */
  serverMessage?: {
    subject?: string;
    type?: LogType;
    content: Record<string, any> | string;
  };
  /**
   * The http status code to send to the client
   * @default 500
   * **Note:** This can only be set once and will be ignored (a server warning will be logged) if set more than once
   */
  status?: number;

  /**
   * The http status text to send to the client
   * @default "Internal Server Error"
   * **Note:** This can only be set once and will be ignored (a server warning will be logged) if set more than once
   */
  statusText?: string;
}
