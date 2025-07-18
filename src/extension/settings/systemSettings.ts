import { SettingsType } from "~/orm/settings/settings-type.ts";
import type { SystemSettings } from "./_system-settings.type.ts";

export const systemSettings = new SettingsType<SystemSettings>(
  "systemSettings",
  {
    systemGlobal: true,
    fields: [{
      key: "enableSignup",
      label: "Enable User Signup",
      type: "BooleanField",
      description:
        "Enable user signup for new accounts. Turn off to prevent new users from signing up.",
      defaultValue: true,
    }],
  },
);
