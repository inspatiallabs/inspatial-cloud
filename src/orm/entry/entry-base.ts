import type { Entry } from "~/orm/entry/entry.ts";
type HashString = `$${string}`;
export interface EntryBase<Fields = Record<string, any>> extends Entry<any> {
  _name: string;
  __fields__: Fields;
  $createdAt: number;
  /**
   * **Updated At** (TimeStampField)
   * @description The date and time this entry was last updated
   * @type {number}
   * @required true
   */
  $updatedAt: number;
  /**
   * **First Name** (DataField)
   * @description The user's first name
   * @type {string}
   * @required true
   */

  save(): Promise<void>;
  [key: HashString]: any;
}

export interface GenericEntry extends EntryBase<Record<string, any>> {
}
