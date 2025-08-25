import type { SettingsBase } from "@inspatial/cloud/types";

export interface EmailSettings extends SettingsBase {
  _name: "emailSettings";
  /**
   * **Final Redirect** (URLField)
   * @description The final url to redirect to after Google OAuth completes
   * @type {string}
   */
  redirectFinal?: string;
  /**
   * **Default Send Account** (ConnectionField)
   *
   * **EntryType** `emailAccount`
   * @description The default email account to use for sending emails
   * @type {string}
   */
  defaultSendAccount?: string;
  /**
   * **Default Send Account Title** (EmailField)
   * @description The email account to send emails from
   * @type {string}
   */
  defaultSendAccount__title?: string;
  isFieldModified(
    fieldKey: keyof {
      [K in keyof EmailSettings as K extends keyof EntryBase ? never : K]: K;
    },
  ): boolean;
}
