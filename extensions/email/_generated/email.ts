import type { ChildList, EntryBase } from "@inspatial/cloud/types";
export interface Email extends EntryBase {
  _name: "email";
  /**
   * **Email Account** (ConnectionField)
   *
   * **EntryType** `emailAccount`
   * @type {string}
   * @required true
   */
  emailAccount: string;
  /**
   * **Sender's Email** (EmailField)
   * @description The email address of the sender
   * @type {string}
   */
  senderEmail?: string;
  /**
   * **Sender's Name** (DataField)
   * @description The name of the sender
   * @type {string}
   */
  senderName?: string;
  /**
   * **Recipient's Name** (DataField)
   * @description The name of the recipient
   * @type {string}
   */
  recipientName?: string;
  /**
   * **Recipient's Emails** (ListField)
   * @description A list of email addresses of the recipients
   * @type {Array<string>}
   * @required true
   */
  recipientEmails: Array<string>;
  /**
   * **Subject** (TextField)
   * @description The subject of the email
   * @type {string}
   */
  subject?: string;
  /**
   * **Content Type** (ChoicesField)
   * @description The content type of the email
   * @type {'html' | 'text'}
   */
  contentType?: "html" | "text";
  /**
   * **Send Date** (TimeStampField)
   * @description The date the email was sent
   * @type {number}
   */
  sendDate?: number;
  /**
   * **Body** (TextField)
   * @description The body of the email
   * @type {string}
   */
  body?: string;
  /**
   * **Link Entry** (DataField)
   * @type {string}
   */
  linkEntry?: string;
  /**
   * **Link Id** (DataField)
   * @type {string}
   */
  linkId?: string;
  /**
   * **Status** (ChoicesField)
   * @description The status of the email
   * @type {'pending' | 'sent' | 'failed'}
   */
  status?: "pending" | "sent" | "failed";
  /**
   * **Has Attachment** (BooleanField)
   * @description Whether the email has an attachment
   * @type {boolean}
   */
  hasAttachment?: boolean;
  /**
   * **File Name** (TextField)
   * @description The name of the file
   * @type {string}
   * @required true
   */
  attachmentFileName: string;
  /**
   * **Content** (TextField)
   * @description The content of the file
   * @type {string}
   * @required true
   */
  attachmentContent: string;
  /**
   * **Content Type** (ChoicesField)
   * @description The content type of the file
   * @type {'text' | 'csv' | 'pdf'}
   * @required true
   */
  attachmentsContentType: "text" | "csv" | "pdf";
  /**
   * **Email** (IDField)
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
   * **Email Account Title** (EmailField)
   * @description The email account to send emails from
   * @type {string}
   */
  emailAccount__title?: string;
}
