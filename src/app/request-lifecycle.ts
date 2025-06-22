import type {
  ConfigDefinition,
  ExtensionConfig,
} from "../cloud-config/config-types.ts";
import type { InRequest } from "/app/in-request.ts";

/**
 * The lifecycle handlers for the incoming requests.
 */
export interface RequestLifecycle<
  C extends ConfigDefinition = ConfigDefinition,
> {
  /** Setup handlers run before the request is processed by any middleware or path handlers. */
  setup: Array<LifecycleHandler<C>>;
  /** Cleanup handlers run after all middleware and path handlers */
  cleanup: Array<LifecycleHandler<C>>;
}

/**
 * A lifecycle handler for the incoming requests.
 */
export interface LifecycleHandler<
  C extends ConfigDefinition = ConfigDefinition,
> {
  /** The name of the lifecycle handler. */
  name: string;
  /** A brief description of the lifecycle handler. */
  description?: string;
  /** The function to run for the lifecycle handler. */
  handler: (
    inRequest: InRequest,
    config: ExtensionConfig<C>,
  ) => Promise<void> | void;
}

export interface LifecycleHandlerRunner {
  setup: Array<{
    name: string;
    description?: string;
    handler: (inRequest: InRequest) => Promise<void> | void;
  }>;
  cleanup: Array<{
    name: string;
    description?: string;
    handler: (inRequest: InRequest) => Promise<void> | void;
  }>;
}
