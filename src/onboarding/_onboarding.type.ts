import type { SettingsBase } from "@inspatial/cloud/types";

export interface Onboarding extends SettingsBase {
  _name: "onboarding";
  /**
   * **Enable Onboarding** (BooleanField)
   * @description Enable or disable onboarding for new users
   * @type {boolean}
   */
  enabled?: boolean;
}
