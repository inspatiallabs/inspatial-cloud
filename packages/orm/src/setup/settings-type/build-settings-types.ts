import type { InSpatialORM } from "#/inspatial-orm.ts";
import type { SettingsType } from "#/settings/settings-type.ts";
import { buildConnectionFields } from "#/setup/setup-utils.ts";

export function buildSettingsType(
  orm: InSpatialORM,
  settingsType: SettingsType,
): void {
  buildConnectionFields(orm, settingsType);
}
