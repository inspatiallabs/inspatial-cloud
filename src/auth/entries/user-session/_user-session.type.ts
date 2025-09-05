import type { ChildList, EntryBase as Base } from "@inspatial/cloud/types";

type UserSessionFields = {
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
   * **Tags** (ArrayField)
   * @description Tags associated with this User Session
   * @type {Array<any>}
   */
  in__tags?: Array<any>;
  /**
   * **User Title** (DataField)
   * @description The user's full name (automatically generated)
   * @type {string}
   */
  user__title?: string;
};
export type UserSession = Base<UserSessionFields> & {
  _name: "userSession";
  __fields__: UserSessionFields;
  /**
   * **User** (ConnectionField)
   *
   * **EntryType** `user`
   * @description The user associated with this session
   * @type {string}
   * @required true
   */
  $user: string;
  /**
   * **Session ID** (DataField)
   * @description Unique identifier for the session
   * @type {string}
   * @required true
   */
  $sessionId: string;
  /**
   * **Session Data** (JSONField)
   * @description Data associated with the session
   * @type {Record<string, any>}
   */
  $sessionData?: Record<string, any>;
  /**
   * **User Session** (IDField)
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
   * @description Tags associated with this User Session
   * @type {Array<any>}
   */
  $in__tags?: Array<any>;
  /**
   * **User Title** (DataField)
   * @description The user's full name (automatically generated)
   * @type {string}
   */
  $user__title?: string;
  isFieldModified(
    fieldKey: keyof {
      [K in keyof UserSession as K extends keyof EntryBase ? never : K]: K;
    },
  ): boolean;
};
