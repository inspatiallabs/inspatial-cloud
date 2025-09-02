import type { EntryBase } from "@inspatial/cloud/types";

export interface EntryMeta extends EntryBase {
  _name: "entryMeta";
  /**
   * **Name** (DataField)
   * @description The unique name of this entry type
   * @type {string}
   * @required true
   */
  name: string;
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
   * **Extension** (ConnectionField)
   *
   * **EntryType** `extensionMeta`
   * @description The extension this entry type belongs to
   * @type {string}
   */
  extension?: string;
  /**
   * **Title Field** (DataField)
   * @description The field to use as the title when displaying this entry type
   * @type {string}
   */
  titleField?: string;
  /**
   * **System Global** (BooleanField)
   * @type {boolean}
   */
  systemGlobal?: boolean;
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
  isFieldModified(
    fieldKey: keyof {
      [K in keyof EntryMeta as K extends keyof EntryBase ? never : K]: K;
    },
  ): boolean;
}
