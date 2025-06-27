import type { Role } from "../../roles/role.ts";
import type { SettingsType } from "~/orm/settings/settings-type.ts";
import { buildConnectionFields } from "~/orm/setup/setup-utils.ts";

export function buildSettingsType(
  role: Role,
  settingsType: SettingsType,
): void {
  buildConnectionFields(role, settingsType);
  if (!settingsType.children) {
    return;
  }
  for (const child of settingsType.children.values()) {
    buildConnectionFields(role, child);
  }
}
