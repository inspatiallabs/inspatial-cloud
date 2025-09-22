import type { ExceptionHandler } from "#types/serve-types.ts";
import type { CloudAPIGroup } from "~/api/cloud-group.ts";
import type { InCloud } from "~/in-cloud.ts";
import type { EntryType, InSpatialORM, SettingsType } from "~/orm/mod.ts";
import type { GlobalSettingsHooks } from "~/orm/orm-types.ts";
import type { Middleware } from "./middleware.ts";
import type { PathHandler } from "./path-handler.ts";
import type { RequestLifecycle } from "./request-lifecycle.ts";
import type {
  ConfigDefinition,
  ExtensionConfig,
} from "~/cloud-config/config-types.ts";
import type { RoleConfig } from "~/orm/roles/role.ts";
import type { AfterMigrate } from "~/extension/cloud-extension.ts";
import type { GlobalEntryHooks } from "@inspatial/cloud/types";
import type { Account } from "#types/models.ts";

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

  globalMigrate: DetailInfo[];
  accountMigrate: DetailInfo[];
}

export interface CacheControlResponseOptions {
  maxAge?: number;
  sMaxAge?: number;
  noCache?: boolean;
  mustRevalidate?: boolean;
  proxyRevalidate?: boolean;
  noStore?: boolean;
  private?: boolean;
  public?: boolean;
  mustUnderstand?: boolean;
  noTransform?: boolean;
  immutable?: boolean;
  staleWhileRevalidate?: number;
  staleIfError?: number;
}

export interface CacheControlRequestParams {
  noCache: boolean;
  noStore: boolean;
  maxAge: number;
  maxStale: number;
  minFresh: number;
  noTransform: boolean;
  onlyIfCached: boolean;
  staleIfError: number;
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

export type AfterOnboarding = (args: {
  inCloud: InCloud;
  account: Account;
  orm: InSpatialORM;
  responses: Record<string, any>;
}) => void | Promise<void>;

export interface ExtensionOptions<
  AG extends Array<CloudAPIGroup> = Array<CloudAPIGroup>,
  C extends ConfigDefinition = ConfigDefinition,
> {
  name: string;
  description?: string;
  version?: string;
  icon?: string;
  config?: C;
  entryTypes?: Array<EntryType<any>>;
  settingsTypes?: Array<SettingsType<any>>;
  ormGlobalHooks?: {
    entries: Partial<GlobalEntryHooks>;
    settings: Partial<GlobalSettingsHooks>;
  };
  apiGroups?: AG;
  install?(
    inCloud: InCloud,
    config: ExtensionConfig<C>,
  ): object | void;
  // boot?: CloudBootFunction;
  afterAccountMigrate?: AfterMigrate | AfterMigrate[];

  afterGlobalMigrate?: AfterMigrate | AfterMigrate[];

  afterOnboarding?: AfterOnboarding;
  /** The lifecycle handlers for the incoming requests. */
  requestLifecycle?: Partial<RequestLifecycle<C>>;
  /** Request middleware */
  middleware?: Middleware[];

  /** Path handlers */
  pathHandlers?: PathHandler[];
  /** Exception handlers */
  exceptionHandlers?: ExceptionHandler[];
  roles?: Array<RoleConfig>;
}
