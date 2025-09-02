import type { ChildList, EntryBase } from "@inspatial/cloud/types";

export interface UserRole extends EntryBase {
  _name: "userRole";
  /**
   * **Role Key** (DataField)
   * @type {string}
   * @required true
   */
  roleKey: string;
  /**
   * **Role Name** (DataField)
   * @type {string}
   * @required true
   */
  roleName: string;
  /**
   * **Description** (TextField)
   * @description A short description of the role
   * @type {string}
   */
  description?: string;
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
      [K in keyof UserRole as K extends keyof EntryBase ? never : K]: K;
    },
  ): boolean;
  entryPermission: ChildList<{
    /**
     * **Entry Type** (ConnectionField)
     *
     * **EntryType** `entryMeta`
     * @type {string}
     */
    entryType?: string;
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
     * **EntryType** `userRole`
     * @type {string}
     * @required true
     */
    parent: string;
    /**
     * **Entry Type Title** (DataField)
     * @type {string}
     */
    entryType__title?: string;
    /**
     * **Parent Title** (DataField)
     * @type {string}
     */
    parent__title?: string;
  }>;
}
