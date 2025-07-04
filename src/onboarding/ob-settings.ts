import { SettingsType } from "~/orm/settings/settings-type.ts";

export const onboardingSettings = new SettingsType("onboarding", {
  fields: [{
    key: "onboardingComplete",
    type: "BooleanField",
  }],
});
