import type { EntryType } from "#/entry/entry-type.ts";
import type { InSpatialORM } from "#/inspatial-orm.ts";
import { EntryTypeMigrator } from "#/migrate/entry-type/entry-type-migrator.ts";
import type { EntryMigrationPlan } from "#/migrate/entry-type/entry-migration-plan.ts";

export async function migrateEntryType(
  entryType: EntryType,
  orm: InSpatialORM,
  onOutput: (message: string) => void,
): Promise<EntryMigrationPlan> {
  const migrator = new EntryTypeMigrator({ entryType, orm, onOutput });
  return await migrator.migrate();
}
