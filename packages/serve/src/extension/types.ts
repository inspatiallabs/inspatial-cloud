import type { ConfigDefinition, ServeConfig } from "#/types.ts";

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
  description: string;
}

/**
 * The information about a server extension.
 */
export type ServerExtensionInfo = {
  /**
   * The name of the extension.
   */
  name: string;
  /**
   * A brief description of the extension.
   */
  description: string;
  /**
   * The environment variable configuration for the extension.
   */
  config: ConfigDefinition;
  /**
   * The request lifecycle handlers for the extension.
   */
  requestExtensions: DetailInfo[];
  /**
   * The middleware for the extension.
   */
  middleware: DetailInfo[];
  /**
   * The path handlers for the extension.
   */
  pathHandlers: DetailInfo[];
};

/**
 * A an object that maps extension names to their install return types.
 */
export type ExtensionMap<C extends ServeConfig> = {
  [P in C["extensions"][number] as P["name"]]: ReturnType<P["install"]>;
};
