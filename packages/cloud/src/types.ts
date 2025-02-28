import type { InSpatialCloud } from "#/inspatial-cloud.ts";
import type { InRequest, InResponse } from "@inspatial/serve";
import type { ActionParamProp } from "@inspatial/serve/actions-api";
import type { CloudAction } from "#/cloud-action.ts";
import type { CloudExtension } from "../mod.ts";
import { EntryHookName } from "../../orm/src/types.ts";
import { Entry, InSpatialORM } from "#orm";

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
