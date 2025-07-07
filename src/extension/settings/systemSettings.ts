import { SettingsType } from "~/orm/settings/settings-type.ts";
import type { SystemSettings } from "./_system-settings.type.ts";

export const systemSettings = new SettingsType<SystemSettings>(
  "systemSettings",
  {
    fields: [],
  },
);
