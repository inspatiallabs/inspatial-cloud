import { SettingsType } from "~/orm/settings/settings-type.ts";
import { googleFields } from "~/auth/settings/field-groups/google-fields.ts";

export const authSettings = new SettingsType("authSettings", {
  label: "Auth Settings",
  systemGlobal: true,
  fields: [...googleFields],
});
