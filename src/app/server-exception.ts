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
