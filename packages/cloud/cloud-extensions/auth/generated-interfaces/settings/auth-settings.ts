import type { SettingsBase } from "#orm/types";
export interface AuthSettings extends SettingsBase {
  _name: "authSettings";
  /**
   * **Enabled** (BooleanField)
   * @description Enable or disable authentication
   * @type {boolean}
   */
  enabled?: boolean;
  /**
   * **Google Client ID** (TextField)
   * @description The client ID for Google authentication.
   * @type {string}
   */
  googleClientId?: string;
  /**
   * **Google Client Secret** (PasswordField)
   * @description The client secret for Google authentication.
   * @type {string}
   */
  googleClientSecret?: string;

  
}
