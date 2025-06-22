import { SettingsType } from "/orm/settings/settings-type.ts";

export const systemSettings = new SettingsType("systemSettings", {
  fields: [{
    key: "onboarded",
    type: "BooleanField",
    label: "Onboarded",
    description: "Whether the system onboarding is complete",
    readOnly: true,
  }],
});
