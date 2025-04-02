import { SettingsType } from "#orm";
import { googleFields } from "#extension/auth/settings-types/auth-settings/field-groups/google-fields.ts";
const authSettings = new SettingsType("authSettings", {
  label: "Auth Settings",
  fields: [{
    key: "enabled",
    type: "BooleanField",
    label: "Enabled",
    description: "Enable or disable authentication",
    defaultValue: true,
  }, ...googleFields],
});

export default authSettings;
