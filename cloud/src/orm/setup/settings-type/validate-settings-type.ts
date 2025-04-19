import type { InSpatialORM } from "#/inspatial-orm.ts";
import type { SettingsType } from "#/settings/settings-type.ts";
import { validateConnectionFields } from "#/setup/setup-utils.ts";

export function validateSettingsType(
  orm: InSpatialORM,
  settingsType: SettingsType,
): void {
  validateConnectionFields(orm, settingsType);
}
