import type {
  ConfigDefinition,
  ExceptionHandler,
  ExtensionConfig,
} from "#types/serve-types.ts";
import { CloudAPIGroup } from "../api/cloud-group.ts";
import { InCloud } from "../cloud/cloud-common.ts";
import { EntryType, SettingsType } from "../orm/mod.ts";
import { EntryHooks } from "../orm/orm-types.ts";
import { CloudBootFunction } from "./cloud-extension.ts";
import { Middleware } from "./middleware.ts";
import { PathHandler } from "./path-handler.ts";
import { RequestLifecycle } from "./request-lifecycle.ts";

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

export interface ExtensionOptions<
  AG extends Array<CloudAPIGroup> = Array<CloudAPIGroup>,
  E extends Array<EntryType<any>> = Array<EntryType<any>>,
  ST extends Array<SettingsType<any>> = Array<SettingsType<any>>,
  C extends ConfigDefinition = ConfigDefinition,
> {
  name: string;
  description?: string;
  version?: string;
  config?: C;
  entryTypes?: E;
  settingsTypes?: ST;
  ormGlobalHooks?: Partial<EntryHooks>;
  actionGroups?: AG;
  install?(
    inCloud: InCloud,
    config: ExtensionConfig<C>,
  ): Promise<object | void> | object | void;
  boot?: CloudBootFunction;
  /** The lifecycle handlers for the incoming requests. */
  requestLifecycle?: Partial<RequestLifecycle<C>>;
  /** Request middleware */
  middleware?: Middleware[];

  /** Path handlers */
  pathHandlers?: PathHandler[];
  /** Exception handlers */
  exceptionHandlers?: ExceptionHandler[];
}
