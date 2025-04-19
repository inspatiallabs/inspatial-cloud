import type { ActionParamProp } from "#/api/api-types.ts";
import type { InSpatialCloud } from "#/inspatial-cloud.ts";
import type { InRequest } from "#/app/in-request.ts";
import type { InResponse } from "#/app/in-response.ts";
import type { EntryHookName } from "#/orm/orm-types.ts";
import type { Entry } from "#/orm/entry/entry.ts";
import type { InSpatialORM } from "#/orm/inspatial-orm.ts";
import type { ConfigDefinition } from "#types/serve-types.ts";

type AppActionConfig<
  K extends string,
  P extends Array<ActionParamProp<K>>,
  D extends {
    [K in P[number] as K["key"]]: K["type"];
  },
> = {
  description?: string;
  /**
   * Whether the user must be authenticated to run this action
   * @default true
   */
  authRequired?: boolean;
  /**
   * Whether this action should be hidden from the API
   * @default false
   */
  hideFromApi?: boolean;
  run: (args: {
    app: InSpatialCloud;
    params: D;
    inRequest: InRequest;
    inResponse: InResponse;
  }) => Promise<any> | any;
  params: P;
};

export type { ActionParamProp, AppActionConfig };

export type AppEntryHooks = Record<EntryHookName, Array<AppHookFunction>>;

export type AppHookFunction = (app: InSpatialCloud, hookParams: {
  entryType: string;
  entry: Entry;
  orm: InSpatialORM;
}) => Promise<void> | void;

export interface CloudExtensionInfo {
  key: string;
  title: string;
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
