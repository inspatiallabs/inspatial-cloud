import { SettingsType } from "~/orm/settings/settings-type.ts";

export const onboardingSettings = new SettingsType("onboarding", {
  fields: [{
    key: "enabled",
    label: "Enable Onboarding",
    type: "BooleanField",
    defaultValue: true,
    description: "Enable or disable onboarding for new users",
  }],
});
