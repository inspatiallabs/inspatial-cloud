import type { SettingsBase } from "@inspatial/cloud/types";

export interface Onboarding extends SettingsBase {
  _name: "onboarding";
  /**
   * **Onboarding Complete** (BooleanField)
   * @type {boolean}
   */
  onboardingComplete?: boolean;
}
