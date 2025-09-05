import type { ChildList, SettingsBase as Base } from "@inspatial/cloud/types";

type SystemSettingsFields = {
  /**
   * **Enable User Signup** (BooleanField)
   * @description Enable user signup for new accounts. Turn off to prevent new users from signing up.
   * @type {boolean}
   */
  enableSignup: boolean;
  /**
   * **Server Host** (URLField)
   * @description The host URL of the server. This is used for generating links and API endpoints.
   * @type {string}
   * @required true
   */
  serverHost: string;
};
export type SystemSettings = Base<SystemSettingsFields> & {
  _name: "systemSettings";
  __fields__: SystemSettingsFields;
  /**
   * **Enable User Signup** (BooleanField)
   * @description Enable user signup for new accounts. Turn off to prevent new users from signing up.
   * @type {boolean}
   */
  $enableSignup: boolean;
  /**
   * **Server Host** (URLField)
   * @description The host URL of the server. This is used for generating links and API endpoints.
   * @type {string}
   * @required true
   */
  $serverHost: string;
  isFieldModified(
    fieldKey: keyof {
      [K in keyof SystemSettings as K extends keyof EntryBase ? never : K]: K;
    },
  ): boolean;
};
