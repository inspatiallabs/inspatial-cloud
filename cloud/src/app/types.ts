import type { ConfigDefinition } from "#types/serve-types.ts";

export interface CloudExtensionInfo {
  key: string;
  label: string;
  description: string;
  version: string;
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
