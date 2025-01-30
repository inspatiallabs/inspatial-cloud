import type { InSpatialServer } from "#/inspatial-server.ts";
import type { InResponse } from "#/in-response.ts";
import type { InRequest } from "#/in-request.ts";

/**
 * A union of all possible response types from a PathHandler.
 */
export type HandlerResponse =
  | void
  | string
  | Record<string, unknown>
  | InResponse
  | Response
  | Record<string, unknown>[]
  | number;
/**
 * A handler for a path.
 * This is used to define a handler for a specific path.
 */
export type PathHandler = {
  /**
   * The name of the path handler.
   */
  name: string;
  /**
   * A description of what the path handler does.
   */
  description: string;

  /**
   * The path that the handler should be called for.
   * This can be a string or an array of strings and must be unique.
   */
  path: string | Array<string>;

  /**
   * The handler for the path.
   * This is called when a request is made to the path.
   * It receives the path, the request object, and the response object.
   * It can modify the response object as needed.
   * If the handler returns a response, the response will be sent to the client as-is.
   */
  handler: (
    server: InSpatialServer,
    inRequest: InRequest,
    inResponse: InResponse,
  ) =>
    | Promise<HandlerResponse>
    | HandlerResponse;
};
