import { InSpatialORM } from "#/inspatial-orm.ts";
import { EntryBase } from "#/entry/entry-base.ts";
import { IDMode } from "#/field/types.ts";
import { ORMFieldDef } from "#/field/field-def-types.ts";
import { BaseTypeConfig, BaseTypeInfo } from "#/shared/shared-types.ts";
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
  E extends EntryBase = EntryBase,
> = {
  key: string;
  description?: string;
  action(
    actionParams:
      & {
        orm: InSpatialORM;
      }
      & { [K in E["_name"] | "entry"]: E }
      & {
        data: Record<string, any>;
      },
  ): Promise<any | void> | any | void;
  params: Array<ActionParamProp>;
};

/**
 * The type of a parameter for an action.
 */
export type ParamTypeProp =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array";

/**
 * A single parameter configuration for an action.
 */
export type ActionParamProp<S extends PropertyKey = string> = {
  key: S;
  /**
   * Whether the parameter is required.
   */
  required?: boolean;
  /**
   * The type of the parameter.
   */
  type: ParamTypeProp;
  /**
   * A label for the parameter.
   */
  label?: string;
  /**
   * A description of the parameter
   */
  description?: string;
};
/**
 * A map of parameter types to their JavaScript types.
 */
export type ParamTypeMap = {
  string: string;
  number: number;
  boolean: boolean;
  object: Record<string, unknown>;
  array: any[];
};

/**
 * A typed map of parameters passed to an action handler.
 */
export type ParamsMap<T> = T extends Array<ActionParamProp<infer S>> ?
    & RequiredParams<T>
    & OptionalParams<T>
  : never;

/**
 * A typed map of required parameters passed to an action handler.
 */

export type RequiredParams<T> = T extends Array<ActionParamProp> ? {
    [K in T[number]["key"]]: T[number]["required"] extends true
      ? ParamTypeMap[T[number]["type"]]
      : never;
  }
  : never;

/**
 * A typed map of optional parameters passed to an action handler.
 */

export type OptionalParams<T> = T extends Record<infer R, ActionParamProp> ? {
    [K in R]: T[K]["required"] extends false ? ParamTypeMap[T[K]["type"]]
      : never;
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
}

export type IDValue = string | number;
