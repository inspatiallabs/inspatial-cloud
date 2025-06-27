import type { LogType } from "~/in-log/types.ts";

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
