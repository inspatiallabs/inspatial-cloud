import type { InSpatialApp } from "./inspatial-app.ts";
import type { InRequest, InResponse } from "@inspatial/serve";
import type { ActionParamProp } from "@inspatial/serve/actions-api";
import type { AppAction } from "./app-action.ts";
import type { AppExtension } from "../mod.ts";

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
    app: InSpatialApp;
    params: D;
    inRequest: InRequest;
    inResponse: InResponse;
  }) => Promise<any> | any;
  params: P;
};

export type { ActionParamProp, AppActionConfig };

export type RunActionMap<AE extends Array<AppExtension>> = {
  [K in AE[number]["actionGroups"][number] as K["groupName"]]: {
    [K2 in K["actions"][number] as K2["actionName"]]: K2 extends
      AppAction<infer N, infer K, infer P, infer D, infer R>
      ? P extends never[] ? undefined : D
      : never;
  };
};

export type ReturnActionMap<AE extends Array<AppExtension>> = {
  [K in AE[number]["actionGroups"][number] as K["groupName"]]: {
    [K2 in K["actions"][number] as K2["actionName"]]: K2 extends
      AppAction<infer N, infer K, infer P, infer D, infer R>
      ? R extends (args: any) => any ? ReturnType<R> : never
      : never;
  };
};
