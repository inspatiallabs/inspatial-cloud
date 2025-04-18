import type { InSpatialORM } from "#/orm/inspatial-orm.ts";
import type { SettingsType } from "#/orm/settings/settings-type.ts";
import { buildConnectionFields } from "#/orm/setup/setup-utils.ts";

export function buildSettingsType(
  orm: InSpatialORM,
  settingsType: SettingsType,
): void {
  buildConnectionFields(orm, settingsType);
}
