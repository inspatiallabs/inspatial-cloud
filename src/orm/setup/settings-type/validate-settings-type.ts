import type { Role } from "../../roles/role.ts";
import type { SettingsType } from "../../settings/settings-type.ts";
import { validateConnectionFields } from "../setup-utils.ts";

export function validateSettingsType(
  role: Role,
  settingsType: SettingsType,
): void {
  validateConnectionFields(role, settingsType);
}
