import type { ChildList, EntryBase } from "@inspatial/cloud/types";

export interface Account extends EntryBase {
  _name: "account";
  /**
   * **Onboarding Complete** (BooleanField)
   * @type {boolean}
   */
  onboardingComplete?: boolean;
  /**
   * **Initialized** (BooleanField)
   * @type {boolean}
   */
  initialized?: boolean;
  /**
   * **Onboarding Response** (JSONField)
   * @type {Record<string, any>}
   */
  obResponse?: Record<string, any>;
  /**
   * **Account** (IDField)
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
  users: ChildList<{
    /**
     * **User** (ConnectionField)
     *
     * **EntryType** `user`
     * @type {string}
     * @required true
     */
    user: string;
    /**
     * **Role** (ChoicesField)
     * @type {'systemAdmin' | 'accountOwner'}
     */
    role?: "systemAdmin" | "accountOwner";
    /**
     * **ID** (IDField)
     * @type {string}
     * @required true
     */
    id: string;
    /**
     * **Order** (IntField)
     * @description The order of this child in the list
     * @type {number}
     */
    order?: number;
    /**
     * **Created At** (TimeStampField)
     * @description The date and time this child was created
     * @type {number}
     * @required true
     */
    createdAt: number;
    /**
     * **Updated At** (TimeStampField)
     * @description The date and time this child was last updated
     * @type {number}
     * @required true
     */
    updatedAt: number;
    /**
     * **Parent** (ConnectionField)
     *
     * **EntryType** `account`
     * @type {string}
     * @required true
     */
    parent: string;
    /**
     * **User Title** (DataField)
     * @description The user's full name (automatically generated)
     * @type {string}
     */
    user__title?: string;
  }>;
}
