import { CloudExtension } from "~/app/cloud-extension.ts";
import { onboardingSettings } from "./ob-settings.ts";
import { onboardingStep } from "./ob-step.ts";

export const onboarding = new CloudExtension("onboarding", {
  entryTypes: [onboardingStep],
  settingsTypes: [onboardingSettings],
});
