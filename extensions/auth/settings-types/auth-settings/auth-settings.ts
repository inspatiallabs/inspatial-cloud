import { SettingsType } from "~/orm/settings/settings-type.ts";
import { googleFields } from "#extensions/auth/settings-types/auth-settings/field-groups/google-fields.ts";
import type { AuthSettings } from "./auth-settings.type.ts";

export const authSettings = new SettingsType<AuthSettings>("authSettings", {
  label: "Auth Settings",
  fields: [{
    key: "enabled",
    type: "BooleanField",
    label: "Enabled",
    description: "Enable or disable authentication",
    defaultValue: true,
  }, ...googleFields],
});
