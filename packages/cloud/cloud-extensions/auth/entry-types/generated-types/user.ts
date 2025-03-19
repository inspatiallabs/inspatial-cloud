import { EntryBase } from "#orm/types";
export interface User extends EntryBase {
  _name: "user";
  /**
   * **User** (IDField)
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
   * @description The user's password used for login
   * @type {string}
   */
  fullName?: string;
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
}
