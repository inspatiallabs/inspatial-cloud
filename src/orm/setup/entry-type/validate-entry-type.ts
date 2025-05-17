import type { InSpatialORM } from "#/orm/inspatial-orm.ts";
import type { EntryType } from "#/orm/entry/entry-type.ts";
import { validateConnectionFields } from "#/orm/setup/setup-utils.ts";

export function validateEntryType(
  orm: InSpatialORM,
  entryType: EntryType,
): void {
  validateConnectionFields(orm, entryType);
}
