import type { InRequest } from "#/app/in-request.ts";
import type { InResponse } from "#/app/in-response.ts";
import type { InCloud } from "@inspatial/cloud/types";
export class RequestPathHandler {
  name: string;
  description: string;
  path: string | Array<string>;
  handler: (
    app: InCloud,
    inRequest: InRequest,
    inResponse: InResponse,
  ) =>
    | Promise<HandlerResponse>
    | HandlerResponse;

  constructor(
    name: string,
    description: string,
    path: string | Array<string>,
    handler: (
      app: InCloud,
      inRequest: InRequest,
      inResponse: InResponse,
    ) =>
      | Promise<HandlerResponse>
      | HandlerResponse,
  ) {
    this.name = name;
    this.description = description;
    this.path = path;
    this.handler = handler;
  }
}

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
    inCloud: InCloud,
    inRequest: InRequest,
    inResponse: InResponse,
  ) =>
    | Promise<HandlerResponse>
    | HandlerResponse;
};
