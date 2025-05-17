import type { InSpatialORM } from "#/orm/inspatial-orm.ts";
import type { SettingsType } from "#/orm/mod.ts";
import { validateConnectionFields } from "#/orm/setup/setup-utils.ts";

export function validateSettingsType(
  orm: InSpatialORM,
  settingsType: SettingsType,
): void {
  validateConnectionFields(orm, settingsType);
}
