import type { ConfigDefinition } from "#types/serve-types.ts";

/**
 * Information about a {@link CloudExtension}
 */
export interface CloudExtensionInfo {
  /**
   * The key of the extension used to identify it programmatically.
   */
  key: string;

  /**
   * A human-readable name for the extension.
   */
  label: string;
  /**
   * A brief description of the extension.
   */
  description: string;
  /**
   * The version of the extension.
   */
  version?: string;
  /**
   * The environment variable configuration for the extension.
   */
  config: ConfigDefinition;
  /**
   * The middleware for the extension.
   */
  middleware: DetailInfo[];
  /**
   * The path handlers for the extension.
   */
  pathHandlers: DetailInfo[];

  /**
   * The lifecycle handlers for the extension.
   */
  lifeCycleHanders: {
    setup: DetailInfo[];
    cleanup: DetailInfo[];
  };
}

/**
 * A generic detail info object with a name and description.
 */
export interface DetailInfo {
  /**
   * The name of the detail.
   */
  name: string;

  /**
   * A brief description of the detail.
   */
  description?: string;
}
