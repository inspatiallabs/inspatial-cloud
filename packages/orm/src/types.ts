import type { Entry } from "#/entry/entry.ts";
import { InSpatialORM } from "#/inspatial-orm.ts";

export type GlobalHookFunction = (hookParams: {
  entryType: string;
  entry: Entry;
  orm: InSpatialORM;
}) => Promise<void> | void;

export type EntryHookName =
  | "beforeValidate"
  | "validate"
  | "beforeCreate"
  | "afterCreate"
  | "beforeUpdate"
  | "afterUpdate"
  | "beforeDelete"
  | "afterDelete";
export type GlobalEntryHooks = Record<
  EntryHookName,
  Array<GlobalHookFunction>
>;
