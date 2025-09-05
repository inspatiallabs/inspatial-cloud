import type { ChildList, EntryBase as Base } from "@inspatial/cloud/types";

type EmailTemplateFields = {
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
  /**
   * **Tags** (ArrayField)
   * @description Tags associated with this Email Template
   * @type {Array<any>}
   */
  in__tags?: Array<any>;
};
export type EmailTemplate = Base<EmailTemplateFields> & {
  _name: "emailTemplate";
  __fields__: EmailTemplateFields;
  /**
   * **Title** (DataField)
   * @type {string}
   * @required true
   */
  $title: string;
  /**
   * **Subject** (DataField)
   * @type {string}
   */
  $subject?: string;
  /**
   * **Content** (RichTextField)
   * @type {string}
   */
  $content?: string;
  /**
   * **ID** (IDField)
   * @type {string}
   * @required true
   */
  $id: string;
  /**
   * **Created At** (TimeStampField)
   * @description The date and time this entry was created
   * @type {number}
   * @required true
   */
  $createdAt: number;
  /**
   * **Updated At** (TimeStampField)
   * @description The date and time this entry was last updated
   * @type {number}
   * @required true
   */
  $updatedAt: number;
  /**
   * **Tags** (ArrayField)
   * @description Tags associated with this Email Template
   * @type {Array<any>}
   */
  $in__tags?: Array<any>;
  isFieldModified(
    fieldKey: keyof {
      [K in keyof EmailTemplate as K extends keyof EntryBase ? never : K]: K;
    },
  ): boolean;
  runAction<N extends keyof EmailTemplateParamsActionMap>(
    actionName: N,
    params: EmailTemplateParamsActionMap[N]["params"],
  ): EmailTemplateParamsActionMap[N]["return"];
};
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
