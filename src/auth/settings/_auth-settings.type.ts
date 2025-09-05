import type { ChildList, SettingsBase as Base } from "@inspatial/cloud/types";

type AuthSettingsFields = {
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
};
export type AuthSettings = Base<AuthSettingsFields> & {
  _name: "authSettings";
  __fields__: AuthSettingsFields;
  /**
   * **Google Client ID** (TextField)
   * @description The client ID for Google authentication.
   * @type {string}
   */
  $googleClientId?: string;
  /**
   * **Google Client Secret** (PasswordField)
   * @description The client secret for Google authentication.
   * @type {string}
   */
  $googleClientSecret?: string;
  /**
   * **Hostname** (URLField)
   * @description The hostname for the server used to construct the redirect URL.
   * @type {string}
   */
  $hostname?: string;
  isFieldModified(
    fieldKey: keyof {
      [K in keyof AuthSettings as K extends keyof EntryBase ? never : K]: K;
    },
  ): boolean;
};
