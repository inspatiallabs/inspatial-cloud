import {
  raiseServerException,
  // deno-lint-ignore no-unused-vars
  type ServerException,
} from "/app/server-exception.ts";

/**
 * The InContext class is instantiated for each inRequest and assigned to the inRequest.context property.
 * It is used to store context data that is shared between lifecycle handlers, middleware, and path handlers
 * for the duration of the request.
 */
export class InContext<
  Context extends Record<string, any> = Record<string, any>,
> {
  #context = new Map();
  /** Register a new key-value pair in the context.
   * @throws {ServerException} if the key already exists.
   * This is a guard against accidentally overwriting a value that's already in the context.
   */
  register<K extends keyof Context>(key: K, value: Context[K]): void {
    if (this.#context.has(key)) {
      raiseServerException(400, `Context key ${key.toString()} already exists`);
    }
    this.#context.set(key, value);
  }
  /** Get a value from the context. */
  get<T = any>(key: string): T | undefined {
    return this.#context.get(key);
  }

  /** Update a value for a given key in the context.
   * @throws {ServerException} If the key does not exist.
   */
  update<K extends keyof Context>(key: K, value: Context[K]): void {
    if (!this.#context.has(key)) {
      raiseServerException(400, `Context key ${key.toString()} does not exist`);
    }
    this.#context.set(key, value);
  }
}
