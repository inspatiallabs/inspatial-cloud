/**
 * An exception class for ORM-related errors.
 */
export class ORMException extends Error {
  /**
   * The subject of the exception.
   */
  subject?: string;
  /**
   * The HTTP response code to use.
   */
  responseCode?: number;
  /**
   * The type of the exception. This can be "error" or "warning".
   * @default "error"
   */
  type: "error" | "warning" = "error";
  /**
   * Create a new ORMException.
   * @param message - The message to include in the exception.
   * @param subject - The subject of the exception.
   * @param responseCode - The HTTP response code to use.
   */
  constructor(message: string, subject?: string, responseCode?: number) {
    super(message);
    this.subject = subject || "ORM Exception";
    this.responseCode = responseCode || 500;
    switch (this.responseCode) {
      case 404:
        this.type = "warning";
        break;
    }

    this.name = "ORMException";
  }
}

/**
 * Raise an ORMException with the given message.
 * @param message - The message to include in the exception.
 * @param subject - The subject of the exception.
 * @param responseCode - The HTTP response code to use.
 */

export function raiseORMException(
  message: string,
  subject?: string,
  responseCode?: number,
): never {
  throw new ORMException(message, subject, responseCode);
}
