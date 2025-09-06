import type { Entry } from "~/orm/entry/entry.ts";
import type { EntryName } from "#types/models.ts";
type HashString = `$${string}`;
export interface EntryBase<
  E extends EntryName = EntryName,
  Fields = Record<string, any>,
> extends Entry<E> {
  _name: E;
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
}

export interface GenericEntry
  extends EntryBase<EntryName, Record<string, any>> {
  [key: HashString]: any;
}
