import type { SettingsBase } from "@inspatial/cloud/types";

export interface SystemSettings extends SettingsBase {
  _name: "systemSettings";
  /**
   * **Enable User Signup** (BooleanField)
   * @description Enable user signup for new accounts. Turn off to prevent new users from signing up.
   * @type {boolean}
   */
  enableSignup?: boolean;
  /**
   * **Server Host** (URLField)
   * @description The host URL of the server. This is used for generating links and API endpoints.
   * @type {string}
   * @required true
   */
  serverHost: string;
  isFieldModified(
    fieldKey: keyof {
      [K in keyof SystemSettings as K extends keyof SettingsBase ? never : K]:
        K;
    },
  ): boolean;
}
