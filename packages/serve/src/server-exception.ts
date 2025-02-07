/**
 * Custom exception class for InSpatialServer server exceptions
 */
export class ServerException extends Error {
  /**
   * Create a new {@link ServerException}
   * @param message  The message to include in the exception
   * @param status The http status code to raise
   */
  constructor(
    message: string,
    public status: number,
    override name = "ServerException",
  ) {
    super(message);
  }
}

/**
 * Type guard for {@link ServerException}
 *
 * @param error - The error to check
 * @returns `true` if the error is a {@link ServerException}
 *
 * @example
 * ```ts
 * try{
 *  // some code that might throw an exception
 * } catch(error){
 *   if(isServerException(error)){
 *     // handle the exception
 *     return;
 *   }
 *   throw error;
 * }
 *
 * ```
 */
export function isServerException(error: unknown): error is ServerException {
  return error instanceof ServerException;
}

/**
 * Helper function to raise a {@link ServerException}
 * @param status The http status code to raise
 * @param message The message to include in the exception
 */
export function raiseServerException(
  status: number,
  message: string,
): never {
  throw new ServerException(message, status);
}

export async function tryCatchServerException<
  FN extends () => Promise<any> | any,
>(
  fn: FN,
): Promise<[ServerException | null, ReturnType<FN> | null]> {
  let err = null;
  let response = null;
  try {
    response = await fn();
  } catch (error) {
    if (isServerException(error)) {
      err = error;
    } else {
      throw error;
    }
  }
  return [err, response];
}

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
  serverMessage?: Record<string, any> | string;
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
