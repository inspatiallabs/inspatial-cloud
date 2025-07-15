import type { EntryBase } from "@inspatial/cloud/types";

export interface Email extends EntryBase {
  _name: "email";
  /**
   * **From** (ConnectionField)
   *
   * **EntryType** `emailAccount`
   * @type {string}
   */
  emailAccount?: string;
  /**
   * **Sender's Name** (DataField)
   * @description The name of the sender
   * @type {string}
   */
  senderName?: string;
  /**
   * **To** (EmailField)
   * @description The email address of the recipient
   * @type {string}
   * @required true
   */
  recipientEmail: string;
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
   * **HTML Body** (RichTextField)
   * @description The HTML body of the email
   * @type {string}
   */
  htmlBody?: string;
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
   * @type {'pending' | 'queued' | 'sent' | 'failed'}
   */
  status?: "pending" | "queued" | "sent" | "failed";
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
   * **From Title** (EmailField)
   * @description The email account to send emails from
   * @type {string}
   */
  emailAccount__title?: string;
  runAction<N extends keyof EmailActionMap>(
    actionName: N,
  ): EmailActionMap[N]["return"];
  runAction<N extends keyof EmailParamsActionMap>(
    actionName: N,
    params: EmailParamsActionMap[N]["params"],
  ): EmailParamsActionMap[N]["return"];
}
type EmailActionMap = {
  enqueueSend: {
    return: Promise<any>;
  };
  send: {
    return: Promise<any>;
  };
};
type EmailParamsActionMap = {};
