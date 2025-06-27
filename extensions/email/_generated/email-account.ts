import type { EntryBase } from "~/orm/entry/entry-base.ts";

export interface EmailAccount extends EntryBase {
  _name: "emailAccount";
  /**
   * **Email Account** (EmailField)
   * @description The email account to send emails from
   * @type {string}
   * @required true
   */
  emailAccount: string;
  /**
   * **Sender's Name** (DataField)
   * @description The name to use when sending emails
   * @type {string}
   */
  senderName?: string;
  /**
   * **Use Gmail OAuth** (BooleanField)
   * @description Use OAuth to authenticate with Gmail
   * @type {boolean}
   */
  useGmailOauth?: boolean;
  /**
   * **Authorize Gmail** (URLField)
   * @description The URL to authorize this email account with Gmail
   * @type {string}
   */
  authUrl?: string;
  /**
   * **Send Emails** (BooleanField)
   * @description Whether this email account can send emails
   * @type {boolean}
   */
  sendEmails?: boolean;
  /**
   * **Receive Emails** (BooleanField)
   * @description Whether this email account can receive emails
   * @type {boolean}
   */
  receiveEmails?: boolean;
  /**
   * **SMTP Host** (TextField)
   * @description The host of the SMTP server. smtp.gmail.com for Gmail
   * @type {string}
   */
  smtpHost?: string;
  /**
   * **SMTP Port** (IntField)
   * @description The port of the SMTP server. 587 for Gmail
   * @type {number}
   */
  smtpPort?: number;
  /**
   * **SMTP User** (DataField)
   * @description The user to authenticate with the SMTP server. This is usually the email address
   * @type {string}
   */
  smtpUser?: string;
  /**
   * **SMTP Password** (PasswordField)
   * @description The password to authenticate with the SMTP server. Not required if using Gmail OAuth
   * @type {string}
   */
  smtpPassword?: string;
  /**
   * **Auth Status** (ChoicesField)
   * @type {'unauthorized' | 'authorized'}
   */
  authStatus?: "unauthorized" | "authorized";
  /**
   * **Access Token** (TextField)
   * @type {string}
   */
  accessToken?: string;
  /**
   * **Expire Time** (TimeStampField)
   * @type {number}
   */
  expireTime?: number;
  /**
   * **Acquired Time** (TimeStampField)
   * @type {number}
   */
  acquiredTime?: number;
  /**
   * **Refresh Token** (TextField)
   * @type {string}
   */
  refreshToken?: string;
  /**
   * **Token Type** (DataField)
   * @type {string}
   */
  tokenType?: string;
  /**
   * **Email Account** (IDField)
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
}
