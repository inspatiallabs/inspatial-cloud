import type { EntryBase } from "@inspatial/cloud/types";

export interface UserSession extends EntryBase {
  _name: "userSession";
  /**
   * **User** (ConnectionField)
   *
   * **EntryType** `user`
   * @description The user associated with this session
   * @type {string}
   * @required true
   */
  user: string;
  /**
   * **Session ID** (DataField)
   * @description Unique identifier for the session
   * @type {string}
   * @required true
   */
  sessionId: string;
  /**
   * **Session Data** (JSONField)
   * @description Data associated with the session
   * @type {Record<string, any>}
   */
  sessionData?: Record<string, any>;
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
   * **User Title** (DataField)
   * @description The user's full name (automatically generated)
   * @type {string}
   */
  user__title?: string;
}
