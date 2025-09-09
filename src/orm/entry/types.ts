import type { InSpatialORM } from "~/orm/inspatial-orm.ts";
import type { IDMode, InValue } from "~/orm/field/types.ts";
import type {
  BaseConfig,
  BaseTypeConfig,
  BaseTypeInfo,
} from "~/orm/shared/shared-types.ts";
import type { InField } from "~/orm/field/field-def-types.ts";
import type { InCloud } from "~/in-cloud.ts";
import type { EntryHookName } from "@inspatial/cloud/types";
import type { ChildEntryList } from "@inspatial/cloud";
import type { EntryMap, EntryName } from "#types/models.ts";
import type { GenericEntry } from "./entry-base.ts";
import type { EntryFieldKeys } from "#types/mod.ts";

/** Hooks */
type EntryHookFunction<
  E extends EntryName | string = EntryName,
> = (
  hookParams:
    & {
      orm: InSpatialORM;
      inCloud: InCloud;
    }
    & {
      [K in E | "entry"]: K extends keyof EntryMap ? EntryMap[K]
        : GenericEntry;
    },
) => Promise<void> | void;

export type EntryHookDefinition<
  E extends EntryName | string = EntryName,
> = {
  /** A unique name for this hook. */
  name: string;
  /** A short description of what this hook does. */
  description?: string;
  /** The function to run when this hook is triggered. */
  handler: EntryHookFunction<E>;
};

/* Entry Actions */
export type EntryActionDefinition<
  E extends EntryName | string = string,
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
        [K in E | "entry"]: K extends keyof EntryMap ? EntryMap[K]
          : GenericEntry;
      }
      & {
        data: Record<string, unknown>;
      },
  ) => Promise<any> | any;
  params: Array<InField>;
};
export type EntryActionMethod<
  E extends EntryName | string = EntryName,
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
      [L in E | "entry"]: L extends keyof EntryMap ? EntryMap[L]
        : GenericEntry;
    },
) => Promise<any> | any;

export type EntryActionConfig<
  E extends EntryName | string = EntryName,
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
  taggable: boolean;
}

/** The configuration options for an `EntryType` */
export type EntryConfig<
  E extends string = string,
> = BaseConfig & {
  /**
   * The field to use as the display value instead of the ID.
   */
  titleField?: EntryFieldKeys<E>;
  idMode?: IDMode;
  imageField?: EntryFieldKeys<E>;
  statusField?: EntryFieldKeys<E>;
  defaultListFields?: Array<EntryFieldKeys<E>>;
  defaultSortField?: EntryFieldKeys<E>;
  defaultSortDirection?: "asc" | "desc";
  searchFields?: Array<EntryFieldKeys<E>>;
  taggable?: boolean;
  index?: Array<EntryIndex<EntryFieldKeys<E>>>;
  actions?: Array<EntryActionDefinition<E>>;
  /** Define hooks to run at various points in the entry lifecycle. */
  hooks?: Partial<Record<EntryHookName, Array<EntryHookDefinition<E>>>>;
};
export type IDValue = string | number;

export type ExtractFieldKeys<E extends EntryName> = keyof {
  [K in keyof EntryMap[E] as K extends `$${string}` ? K : never]: K;
};

export type UpdateEntry<E extends EntryName> = {
  [
    K in keyof EntryMap[E]["__fields__"] as K extends BannedFieldKeys ? never
      : K
  ]?: ExtractUpdateChildList<EntryMap[E]["__fields__"][K]>;
};
export type NewEntry<E extends EntryName> =
  & {
    [
      K in keyof EntryMap[E]["__fields__"] as K extends BannedFieldKeys ? never
        : IgnoreBoolen<K, EntryMap[E]["__fields__"][K]>
    ]: ExtractNewChildList<
      EntryMap[E]["__fields__"][K]
    >;
  }
  & {
    [
      K in keyof EntryMap[E][
        "__fields__"
      ] as EntryMap[E]["__fields__"][K] extends boolean ? K
        : never
    ]?: EntryMap[E]["__fields__"][K];
  };

type IgnoreBoolen<K, B> = B extends boolean ? never : K;

type BannedFieldKeys =
  | "id"
  | "createdAt"
  | "updatedAt"
  | `${string}__title`;

type BannedChildFields =
  | "id"
  | "createdAt"
  | "updatedAt"
  | "parent"
  | "order"
  | `${string}__title`;

type NewChild<T> = {
  [K in keyof T as K extends BannedChildFields ? never : K]: T[K];
};
type UpdateChild<T> = {
  [K in keyof T as K extends BannedChildFields ? never : K]?: T[K];
};

type SafeKeys<T> = keyof {
  [K in keyof T as K extends BannedFieldKeys ? never : K]: K;
};

export type ExtractNewChildList<T> = T extends ChildEntryList<infer U>
  ? Array<NewChild<U>>
  : T;

type ExtractUpdateChildList<T> = T extends ChildEntryList<infer U>
  ? Array<UpdateChild<U>>
  : T;

export type EntryIndex<FK extends PropertyKey = PropertyKey> = {
  fields: Array<FK>;
  unique?: boolean;
};

export interface EntryConnection {
  referencingEntry: string;
  referencingEntryLabel: string;
  referencingField: string;
  referencingFieldLabel: string;
  listFields: Array<InField>;
}
