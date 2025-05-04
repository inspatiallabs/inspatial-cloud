import type { InSpatialORM } from "#/orm/inspatial-orm.ts";
import type { EntryBase, GenericEntry } from "#/orm/entry/entry-base.ts";
import type { IDMode, InValueTypeMap } from "#/orm/field/types.ts";
import type { ORMFieldDef } from "#/orm/field/field-def-types.ts";
import type {
  BaseTypeConfig,
  BaseTypeInfo,
} from "#/orm/shared/shared-types.ts";
/* Hooks */
type EntryHookFunction<
  E extends EntryBase = EntryBase,
> = (
  hookParams:
    & {
      orm: InSpatialORM;
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
      }
      & {
        [K in E["_name"] | "entry"]: E;
      }
      & {
        data: Record<string, any>;
      },
  ) => Promise<any> | any;
  params: Array<ORMFieldDef>;
};

/**
 * A typed map of parameters passed to an action handler.
 */
export type ParamsMap<T> = RequiredParams<T> & OptionalParams<T>;

/**
 * A typed map of required parameters passed to an action handler.
 */

type RequiredParams<T> = T extends Array<ORMFieldDef> ? {
    [K in T[number] as K["required"] extends true ? K["key"] : never]:
      InValueTypeMap[K["type"]];
  }
  : never;

/**
 * A typed map of optional parameters passed to an action handler.
 */
type OptionalParams<T> = T extends Array<ORMFieldDef> ? {
    [K in T[number] as K["required"] extends true ? never : K["key"]]?:
      | InValueTypeMap[K["type"]]
      | undefined;
  }
  : never;

export interface EntryTypeInfo extends BaseTypeInfo {
  config: EntryTypeConfig;
  actions: Array<Omit<EntryActionDefinition, "action">>;
  defaultListFields: Array<ORMFieldDef>;
}

export interface EntryTypeConfig extends BaseTypeConfig {
  tableName: string;
  titleField?: string;
  idMode: IDMode;
  searchFields?: Array<any>;
  defaultListFields?: Array<string>;
}

export type IDValue = string | number;

export type ExtractFieldKeys<T> = keyof {
  [K in keyof T as K extends keyof EntryBase ? never : K]: K;
};
