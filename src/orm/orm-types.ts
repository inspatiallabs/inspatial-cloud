import type { Entry } from "~/orm/entry/entry.ts";
import type { InSpatialORM } from "~/orm/inspatial-orm.ts";
import type { QueryResultFormatted } from "~/orm/db/db-types.ts";
import type { InCloud } from "~/in-cloud.ts";

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

export type EntryHooks = Record<EntryHookName, Array<EntryHookFunction>>;

export type EntryHookFunction = (app: InCloud, hookParams: {
  entryType: string;
  entry: Entry;
  orm: InSpatialORM;
}) => Promise<void> | void;
export type UniqueArray<T> = T extends ReadonlyArray<infer U>
  ? U[] & { __unique: never }
  : never;
