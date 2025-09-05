import type { ChildList, EntryBase as Base } from "@inspatial/cloud/types";

type UserRoleFields = {
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
  /**
   * **Tags** (ArrayField)
   * @description Tags associated with this User Role
   * @type {Array<any>}
   */
  in__tags?: Array<any>;
};
export type UserRole = Base<UserRoleFields> & {
  _name: "userRole";
  __fields__: UserRoleFields;
  /**
   * **Role Key** (DataField)
   * @type {string}
   * @required true
   */
  $roleKey: string;
  /**
   * **Role Name** (DataField)
   * @type {string}
   * @required true
   */
  $roleName: string;
  /**
   * **Description** (TextField)
   * @description A short description of the role
   * @type {string}
   */
  $description?: string;
  /**
   * **ID** (IDField)
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
   * @description Tags associated with this User Role
   * @type {Array<any>}
   */
  $in__tags?: Array<any>;
  isFieldModified(
    fieldKey: keyof {
      [K in keyof UserRole as K extends keyof EntryBase ? never : K]: K;
    },
  ): boolean;
  runAction<N extends keyof UserRoleActionMap>(
    actionName: N,
  ): UserRoleActionMap[N]["return"];
};
type UserRoleActionMap = {
  generateConfig: {
    return: Promise<any>;
  };
};
