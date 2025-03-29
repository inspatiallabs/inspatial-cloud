import type { Entry } from "#/entry/entry.ts";
import type { InSpatialORM } from "#/inspatial-orm.ts";

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
