import type { SettingsBase } from "@inspatial/cloud/types";

export interface SystemSettings extends SettingsBase {
  _name: "systemSettings";
  /**
   * **Enable User Signup** (BooleanField)
   * @description Enable user signup for new accounts. Turn off to prevent new users from signing up.
   * @type {boolean}
   */
  enableSignup?: boolean;
}
