import { SettingsType } from "~/orm/settings/settings-type.ts";
import { googleFields } from "~/auth/settings/field-groups/google-fields.ts";
import type { AuthSettings } from "./_auth-settings.type.ts";

export const authSettings = new SettingsType<AuthSettings>("authSettings", {
  label: "Auth Settings",
  systemGlobal: true,
  fields: [...googleFields],
});
