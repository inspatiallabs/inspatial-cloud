import type { Entry } from "#/orm/entry/entry.ts";
import type { InSpatialORM } from "#/orm/inspatial-orm.ts";
import type { QueryResultFormatted } from "#/orm/db/db-types.ts";

export type GlobalHookFunction = (hookParams: {
  entryType: string;
  entry: Entry;
  orm: InSpatialORM;
}) => Promise<void> | void;

export type HookName =
  | "beforeValidate"
  | "validate"
  | "beforeUpdate"
  | "afterUpdate";
export type EntryHookName =
  | HookName
  | "beforeCreate"
  | "afterCreate"
  | "beforeDelete"
  | "afterDelete";
export type GlobalEntryHooks = Record<
  EntryHookName,
  Array<GlobalHookFunction>
>;

export type GetListResponse<T> = QueryResultFormatted<T>;
