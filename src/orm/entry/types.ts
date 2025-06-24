import type { InSpatialORM } from "/orm/inspatial-orm.ts";
import type { EntryBase, GenericEntry } from "/orm/entry/entry-base.ts";
import type { IDMode, InValue } from "/orm/field/types.ts";
import type {
  BaseConfig,
  BaseTypeConfig,
  BaseTypeInfo,
} from "/orm/shared/shared-types.ts";
import type { InField } from "/orm/field/field-def-types.ts";
import type { InCloud } from "../../cloud/cloud-common.ts";
import type { EntryHookName } from "@inspatial/cloud/types";
import type { EntryRole } from "../roles/entry-permissions.ts";

/* Hooks */
type EntryHookFunction<
  E extends EntryBase = EntryBase,
> = (
  hookParams:
    & {
      orm: InSpatialORM;
      inCloud: InCloud;
    }
    & {
      [K in E["_name"] | "entry"]: E;
    },
) => Promise<void> | void;

export type EntryHookDefinition<
  E extends EntryBase = EntryBase,
> = {
  name: string;
  description?: string;
  handler: EntryHookFunction<E>;
};

/* Entry Actions */
export type EntryActionDefinition<
  E extends EntryBase = GenericEntry,
> = {
  key: string;
  label?: string;
  description?: string;
  /**
   * Set to true to hide this action from the api.
   * This means it can only be called from server side code.
   */
  private?: boolean;
  action: (
    args:
      & {
        orm: InSpatialORM;
        inCloud: InCloud;
      }
      & {
        [K in E["_name"] | "entry"]: E;
      }
      & {
        data: Record<string, unknown>;
      },
  ) => Promise<any> | any;
  params: Array<InField>;
};
export type EntryActionMethod<
  E extends EntryBase = GenericEntry,
  K extends PropertyKey = PropertyKey,
  P extends Array<ActionParam<K>> = Array<ActionParam<K>>,
> = (
  args:
    & {
      orm: InSpatialORM;
      data: ExtractParams<K, P>;
      inCloud: InCloud;
    }
    & {
      [K in E["_name"] | "entry"]: E;
    },
) => Promise<any> | any;

export type EntryActionConfig<
  E extends EntryBase = GenericEntry,
  K extends PropertyKey = PropertyKey,
  P extends Array<ActionParam<K>> = Array<ActionParam<K>>,
  R extends EntryActionMethod<E, K, P> = EntryActionMethod<E, K, P>,
> = {
  key: string;
  label?: string;
  description?: string;
  /**
   * Set to true to hide this action from the api.
   * This means it can only be called from server side code.
   */
  private?: boolean;
  action: R;
  params: P;
};

/**
 * A typed map of parameters passed to an action handler.
 */
export type ActionParam<P extends PropertyKey> = Omit<InField, "key"> & {
  key: P;
};
/**
 * A typed map of required parameters passed to an action handler.
 */

export type ExtractParams<
  K extends PropertyKey,
  P extends Array<ActionParam<K>>,
> =
  & {
    [S in P[number] as S["required"] extends true ? S["key"] : never]: InValue<
      S["type"]
    >;
  }
  & {
    [S in P[number] as S["required"] extends true ? never : S["key"]]?: InValue<
      S["type"]
    >;
  };

export interface EntryTypeInfo extends BaseTypeInfo {
  config: EntryTypeConfig;
  actions: Array<Omit<EntryActionDefinition, "action">>;
  defaultListFields: Array<InField>;
}

export interface EntryTypeConfig extends BaseTypeConfig {
  tableName: string;
  titleField?: string;
  idMode: IDMode;
  searchFields?: Array<any>;
  defaultListFields?: Array<string>;
  index: Array<EntryIndex<string>>;
}
export type EntryConfig<
  E extends EntryBase = GenericEntry,
  A extends Array<EntryActionDefinition<E>> = Array<
    EntryActionDefinition<E>
  >,
  FK extends PropertyKey = ExtractFieldKeys<E>,
> = BaseConfig & {
  /**
   * The field to use as the display value instead of the ID.
   */
  titleField?: FK;
  idMode?: IDMode;
  imageField?: FK;
  defaultListFields?: Array<FK>;
  defaultSortField?: FK;
  defaultSortDirection?: "asc" | "desc";
  searchFields?: Array<FK>;
  index?: Array<EntryIndex<FK>>;
  actions?: A;
  hooks?: Partial<Record<EntryHookName, Array<EntryHookDefinition<E>>>>;
  roles?: Array<EntryRole<FK>>;
};
export type IDValue = string | number;

export type ExtractFieldKeys<T> = keyof {
  [K in keyof T as K extends keyof EntryBase ? never : K]: K;
};

export type EntryIndex<FK extends PropertyKey = PropertyKey> = {
  fields: Array<FK>;
  unique?: boolean;
};
