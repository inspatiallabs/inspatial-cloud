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
    }, {
      key: "serverHost",
      label: "Server Host",
      type: "URLField",
      description:
        "The host URL of the server. This is used for generating links and API endpoints.",
      defaultValue: "http://localhost:8000",
      required: true,
    }],
  },
);
