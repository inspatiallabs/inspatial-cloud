import type { InSpatialCloud } from "#/inspatial-cloud.ts";
import type { InRequest } from "#/app/in-request.ts";
import type { InResponse } from "#/app/in-response.ts";

/**
 * Middleware for InSpatialServer.
 */
export type ServerMiddleware = {
  /**
   * The name of the middleware.
   * This should be unique. If a middleware with the same name is added more than once, an error will be thrown, preventing the server from starting.
   */
  name: string;
  /**
   * A description of what the middleware does.
   */
  description: string;
  /**
   * The handler for the middleware.
   * If the handler returns a response, the response will be sent to the client immediately,
   * skipping any further middleware or request handling.
   */
  handler: (
    app: InSpatialCloud,
    inRequest: InRequest,
    inResponse: InResponse,
  ) => Promise<void | InResponse | Response> | void | InResponse | Response;
};

/**
 * Creates a middleware for InSpatialServer.
 */
export function createServerMiddleware(
  serverMiddleware: ServerMiddleware,
): ServerMiddleware {
  return serverMiddleware;
}
