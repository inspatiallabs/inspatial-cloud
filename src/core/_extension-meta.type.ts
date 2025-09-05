import type { ChildList, EntryBase as Base } from "@inspatial/cloud/types";

type ExtensionMetaFields = {
  /**
   * **Key** (DataField)
   * @type {string}
   * @required true
   */
  key: string;
  /**
   * **Label** (DataField)
   * @type {string}
   * @required true
   */
  label: string;
  /**
   * **Description** (TextField)
   * @type {string}
   */
  description?: string;
  /**
   * **Version** (DataField)
   * @description The version of this extension
   * @type {string}
   */
  version?: string;
  /**
   * **Cloud Extension** (IDField)
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
   * @description Tags associated with this Cloud Extension
   * @type {Array<any>}
   */
  in__tags?: Array<any>;
};
export type ExtensionMeta = Base<ExtensionMetaFields> & {
  _name: "extensionMeta";
  __fields__: ExtensionMetaFields;
  /**
   * **Key** (DataField)
   * @type {string}
   * @required true
   */
  $key: string;
  /**
   * **Label** (DataField)
   * @type {string}
   * @required true
   */
  $label: string;
  /**
   * **Description** (TextField)
   * @type {string}
   */
  $description?: string;
  /**
   * **Version** (DataField)
   * @description The version of this extension
   * @type {string}
   */
  $version?: string;
  /**
   * **Cloud Extension** (IDField)
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
   * @description Tags associated with this Cloud Extension
   * @type {Array<any>}
   */
  $in__tags?: Array<any>;
  isFieldModified(
    fieldKey: keyof {
      [K in keyof ExtensionMeta as K extends keyof EntryBase ? never : K]: K;
    },
  ): boolean;
};
