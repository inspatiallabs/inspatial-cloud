import type { EntryBase } from "@inspatial/cloud/types";

export interface ExtensionMeta extends EntryBase {
  _name: "extensionMeta";
  /**
   * **Key** (DataField)
   * @type {string}
   * @required true
   */
  key: string;
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
  isFieldModified(
    fieldKey: keyof {
      [K in keyof ExtensionMeta as K extends keyof EntryBase ? never : K]: K;
    },
  ): boolean;
}
