import type { SettingsBase } from "@inspatial/cloud/types";

export interface AuthSettings extends SettingsBase {
  _name: "authSettings";
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
  /**
   * **Hostname** (URLField)
   * @description The hostname for the server used to construct the redirect URL.
   * @type {string}
   */
  hostname?: string;
}
