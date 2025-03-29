import { SettingsType } from "#orm";
import type { AuthSettings } from "../../../../../../dev/.inspatial/_generated/settings/auth-settings.ts";
const authSettings = new SettingsType<AuthSettings>("authSettings", {
  label: "Auth Settings",
  fields: [{
    key: "enabled",
    type: "BooleanField",
    label: "Enabled",
    description: "Enable or disable authentication",
    defaultValue: true,
  }],
});

export default authSettings;
