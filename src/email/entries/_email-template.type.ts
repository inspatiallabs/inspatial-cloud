import type { EntryBase } from "@inspatial/cloud/types";

export interface EmailTemplate extends EntryBase {
  _name: "emailTemplate";
  /**
   * **Title** (DataField)
   * @type {string}
   * @required true
   */
  title: string;
  /**
   * **Subject** (DataField)
   * @type {string}
   */
  subject?: string;
  /**
   * **Content** (RichTextField)
   * @type {string}
   */
  content?: string;
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
  runAction<N extends keyof EmailTemplateParamsActionMap>(
    actionName: N,
    params: EmailTemplateParamsActionMap[N]["params"],
  ): EmailTemplateParamsActionMap[N]["return"];
}
type EmailTemplateParamsActionMap = {
  renderTemplate: {
    params: {
      /**
       * **Params** (JSONField)
       * @type {Record<string, any>}
       * @required true
       */
      params: Record<string, any>;
    };
    return: any;
  };
};
