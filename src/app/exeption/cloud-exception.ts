type CloudExceptionType = "fatal" | "error" | "warning";
interface CloudExeptionOptions {
  scope?: string;
  type?: CloudExceptionType;
}
/**
 * Custom exception class for InSpatial Cloud
 */

export class CloudException extends Error {
  override name = "CloudException";
  scope: string;
  type: CloudExceptionType;

  static isCloudException(e: unknown): e is CloudException {
    if (e instanceof CloudException) {
      return true;
    }
    return false;
  }

  constructor(
    message: string,
    options?: CloudExeptionOptions,
  ) {
    super(message);
    this.scope = options?.scope || "unknown";
    this.type = options?.type || "error";
  }
}

export function raiseCloudException(
  message: string,
  options?: CloudExeptionOptions,
): never {
  throw new CloudException(message, options);
}
