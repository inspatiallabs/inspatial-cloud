import { EntryBase } from "#orm/types";
export interface UserSession extends EntryBase {
  _name: "userSession";
  /**
   * **User Session** (IDField)
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
   * **User** (ConnectionField)
   *
   * **EntryType** `user`
   * @type {string}
   */
  user?: string;
  _userTitle: string;
}
