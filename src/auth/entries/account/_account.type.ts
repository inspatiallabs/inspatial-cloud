import type { ChildList, EntryBase } from "@inspatial/cloud/types";

export interface Account extends EntryBase {
  _name: "account";
  /**
   * **Account Owner** (ConnectionField)
   *
   * **EntryType** `user`
   * @description The user who owns this account. Only one user can be the owner.
   * @type {string}
   */
  owner?: string;
  /**
   * **Account Name** (DataField)
   * @description The name of the account
   * @type {string}
   * @required true
   */
  name: string;
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
  /**
   * **Tags** (ArrayField)
   * @description Tags associated with this Account
   * @type {Array<any>}
   */
  in__tags?: Array<any>;
  /**
   * **Account Owner Title** (DataField)
   * @description The user's full name (automatically generated)
   * @type {string}
   */
  owner__title?: string;
  isFieldModified(
    fieldKey: keyof {
      [K in keyof Account as K extends keyof EntryBase ? never : K]: K;
    },
  ): boolean;
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
     * **Is Owner** (BooleanField)
     * @type {boolean}
     */
    isOwner?: boolean;
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
    /**
     * **Parent Title** (DataField)
     * @description The name of the account
     * @type {string}
     */
    parent__title?: string;
  }>;
  runAction<N extends keyof AccountActionMap>(
    actionName: N,
  ): AccountActionMap[N]["return"];
  runAction<N extends keyof AccountParamsActionMap>(
    actionName: N,
    params: AccountParamsActionMap[N]["params"],
  ): AccountParamsActionMap[N]["return"];
}
type AccountActionMap = {
  queueInitialize: {
    return: Promise<any>;
  };
  initialize: {
    return: Promise<any>;
  };
};
type AccountParamsActionMap = {
  addUser: {
    params: {
      /**
       * **First Name** (DataField)
       * @type {string}
       * @required true
       */
      firstName: string;
      /**
       * **Last Name** (DataField)
       * @type {string}
       * @required true
       */
      lastName: string;
      /**
       * **Email** (DataField)
       * @type {string}
       * @required true
       */
      email: string;
      /**
       * **Role** (ChoicesField)
       * @type {'systemAdmin' | 'accountOwner'}
       * @required true
       */
      role: "systemAdmin" | "accountOwner";
    };
    return: Promise<any>;
  };
};
