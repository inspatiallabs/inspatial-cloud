import type { InRequest } from "#/in-request.ts";

/**
 * An extension for the InRequest class.
 * This can be used to add custom functionality to the InRequest class.
 * It's called in the constructor of the InRequest class,
 * so it can be used to modify the request object before it's used in further middleware or request handling.
 */
export type RequestExtension = {
  /**
   * The name of the extension. This should be unique.
   * If an extension with the same name is added more than once, an error will be thrown,
   * preventing the server from starting.
   */
  name: string;
  /**
   * A description of what the extension does.
   */
  description: string;

  /**
   * The handler for the extension.
   * This is called in the constructor of the InRequest class.
   * It receives the original request object and can modify the InRequest object as needed.
   */
  handler: (request: InRequest) => void;
};
