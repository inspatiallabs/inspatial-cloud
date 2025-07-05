import { SettingsType } from "~/orm/settings/settings-type.ts";
import type { SystemSettings } from "./system-settings.type.ts";

export const systemSettings = new SettingsType<SystemSettings>(
  "systemSettings",
  {
    fields: [{
      key: "onboarded",
      type: "BooleanField",
      label: "Onboarded",
      description: "Whether the system onboarding is complete",
      readOnly: true,
    }],
  },
);
