import type { Entry } from "~/orm/entry/entry.ts";

export interface EntryBase extends Entry<any> {
  _name: string;
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

  save(): Promise<void>;
}

export interface GenericEntry extends EntryBase {
  [key: string]: any;
}
