import type { SettingsBase } from "@inspatial/cloud/types";

export interface SystemSettings extends SettingsBase {
  _name: "systemSettings";
  /**
   * **Onboarded** (BooleanField)
   * @description Whether the system onboarding is complete
   * @type {boolean}
   */
  onboarded?: boolean;
}
