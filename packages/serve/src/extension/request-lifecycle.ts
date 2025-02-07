import type { InRequest } from "#/in-request.ts";

/**
 * The lifecycle handlers for the incoming requests.
 */
export interface RequestLifecycle {
  /** Setup handlers run before the request is processed by any middleware or path handlers. */
  setup: Array<LifecycleHandler>;
  /** Cleanup handlers run after all middleware and path handlers */
  cleanup: Array<LifecycleHandler>;
}

/**
 * A lifecycle handler for the incoming requests.
 */
export interface LifecycleHandler {
  /** The name of the lifecycle handler. */
  name: string;
  /** A brief description of the lifecycle handler. */
  description?: string;
  /** The function to run for the lifecycle handler. */
  handler: (inRequest: InRequest) => Promise<void> | void;
}
