import { ActionParamProp } from "#/api/api-types.ts";
import { InSpatialCloud } from "#/inspatial-cloud.ts";
import { InRequest } from "#/app/in-request.ts";
import { InResponse } from "#/app/in-response.ts";
import { CloudExtension } from "#/app/cloud-extension.ts";
import { CloudAction } from "#/app/cloud-action.ts";
import { EntryHookName } from "#/orm/orm-types.ts";
import { Entry } from "#/orm/entry/entry.ts";
import { InSpatialORM } from "#/orm/inspatial-orm.ts";
import { ConfigDefinition, ServeConfig } from "#types/serve-types.ts";

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

export type RunActionMap<AE extends Array<CloudExtension>> = {
  [K in AE[number]["actionGroups"][number] as K["groupName"]]: {
    [K2 in K["actions"][number] as K2["actionName"]]: K2 extends
      CloudAction<infer N, infer K, infer P, infer D, infer R>
      ? P extends never[] ? undefined : D
      : never;
  };
};

export type ReturnActionMap<AE extends Array<CloudExtension>> = {
  [K in AE[number]["actionGroups"][number] as K["groupName"]]: {
    [K2 in K["actions"][number] as K2["actionName"]]: K2 extends
      CloudAction<infer N, infer K, infer P, infer D, infer R>
      ? R extends (args: any) => any ? ReturnType<R> : never
      : never;
  };
};

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
  description: string;
}

/**
 * A an object that maps extension names to their install return types.
 */
export type ExtensionMap<C extends ServeConfig> = {
  [P in C["extensions"][number] as P["name"]]: ReturnType<P["install"]>;
};
