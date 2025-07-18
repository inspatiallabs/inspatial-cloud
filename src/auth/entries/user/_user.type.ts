import type { EntryBase } from "@inspatial/cloud/types";

export interface User extends EntryBase {
  _name: "user";
  /**
   * **First Name** (DataField)
   * @description The user's first name
   * @type {string}
   * @required true
   */
  firstName: string;
  /**
   * **Last Name** (DataField)
   * @description The user's last names
   * @type {string}
   * @required true
   */
  lastName: string;
  /**
   * **Email** (EmailField)
   * @description The user's email address used for login
   * @type {string}
   * @required true
   */
  email: string;
  /**
   * **Full Name** (DataField)
   * @description The user's full name (automatically generated)
   * @type {string}
   */
  fullName?: string;
  /**
   * **Profile Picture** (ImageField)
   * @description The user's profile picture
   * @type {string}
   */
  profilePicture?: string;
  /**
   * **Password** (PasswordField)
   * @description The user's password used for login
   * @type {string}
   */
  password?: string;
  /**
   * **Reset Password Token** (PasswordField)
   * @description The token used to reset the user's password
   * @type {string}
   */
  resetPasswordToken?: string;
  /**
   * **System Administrator** (BooleanField)
   * @description Is the user a system administrator? (admin users have access to all parts of the system)
   * @type {boolean}
   */
  systemAdmin?: boolean;
  /**
   * **API Token** (PasswordField)
   * @description The user's API token
   * @type {string}
   */
  apiToken?: string;
  /**
   * **Access Token** (PasswordField)
   * @description The access token used to authenticate the user with Google.
   * @type {string}
   */
  googleAccessToken?: string;
  /**
   * **Refresh Token** (PasswordField)
   * @description The refresh token used to refresh the access token.
   * @type {string}
   */
  googleRefreshToken?: string;
  /**
   * **Google Credential** (JSONField)
   * @description The credential used to authenticate the user with Google.
   * @type {Record<string, any>}
   */
  googleCredential?: Record<string, any>;
  /**
   * **Google ID** (TextField)
   * @description The user's Google ID.
   * @type {string}
   */
  googleId?: string;
  /**
   * **Google Picture** (URLField)
   * @description The user's Google profile picture.
   * @type {string}
   */
  googlePicture?: string;
  /**
   * **Google Auth Status** (ChoicesField)
   * @type {'authenticated' | 'notAuthenticated'}
   */
  googleAuthStatus?: "authenticated" | "notAuthenticated";
  /**
   * **ID** (IDField)
   * @type {string}
   * @required true
   */
  id: string;
  /**
   * **Created At** (TimeStampField)
   * @description The date and time this entry was created
   * @type {number}
   * @required true
   */
  createdAt: number;
  /**
   * **Updated At** (TimeStampField)
   * @description The date and time this entry was last updated
   * @type {number}
   * @required true
   */
  updatedAt: number;
  /**
   * **Profile Picture Title** (DataField)
   * @type {string}
   */
  profilePicture__title?: string;
  runAction<N extends keyof UserActionMap>(
    actionName: N,
  ): UserActionMap[N]["return"];
  runAction<N extends keyof UserParamsActionMap>(
    actionName: N,
    params: UserParamsActionMap[N]["params"],
  ): UserParamsActionMap[N]["return"];
}
type UserActionMap = {
  generateApiToken: {
    return: Promise<any>;
  };
  generateResetToken: {
    return: Promise<any>;
  };
  findAccounts: {
    return: Promise<any>;
  };
};
type UserParamsActionMap = {
  setPassword: {
    params: {
      /**
       * **Password** (PasswordField)
       * @description Password to set
       * @type {string}
       * @required true
       */
      password: string;
    };
    return: Promise<any>;
  };
  validatePassword: {
    params: {
      /**
       * **Password** (PasswordField)
       * @description Password to validate
       * @type {string}
       * @required true
       */
      password: string;
    };
    return: Promise<any>;
  };
};
