import type { ChildList, EntryBase as Base } from "@inspatial/cloud/types";

type EntryPermissionFields = {
  /**
   * **Role** (ConnectionField)
   *
   * **EntryType** `userRole`
   * @description The user role this permission applies to
   * @type {string}
   * @required true
   */
  role: string;
  /**
   * **Entry** (ConnectionField)
   *
   * **EntryType** `entryMeta`
   * @description The entry type this permission applies to
   * @type {string}
   * @required true
   */
  entryMeta: string;
  /**
   * **Can View** (BooleanField)
   * @type {boolean}
   */
  canView: boolean;
  /**
   * **Can Modify** (BooleanField)
   * @type {boolean}
   */
  canModify: boolean;
  /**
   * **Can Create** (BooleanField)
   * @type {boolean}
   */
  canCreate: boolean;
  /**
   * **Can Delete** (BooleanField)
   * @type {boolean}
   */
  canDelete: boolean;
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
   * @description Tags associated with this Entry Permission
   * @type {Array<any>}
   */
  in__tags?: Array<any>;
  /**
   * **Role Title** (DataField)
   * @type {string}
   */
  role__title?: string;
  /**
   * **Entry Title** (DataField)
   * @type {string}
   */
  entryMeta__title?: string;
  fieldPermissions: ChildList<{
    /**
     * **Field** (ConnectionField)
     *
     * **EntryType** `fieldMeta`
     * @type {string}
     * @required true
     */
    field: string;
    /**
     * **Can View** (BooleanField)
     * @type {boolean}
     */
    canView: boolean;
    /**
     * **Can Modify** (BooleanField)
     * @type {boolean}
     */
    canModify: boolean;
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
     * **EntryType** `entryPermission`
     * @type {string}
     * @required true
     */
    parent: string;
    /**
     * **Field Title** (DataField)
     * @type {string}
     */
    field__title?: string;
  }>;
};
export type EntryPermission = Base<EntryPermissionFields> & {
  _name: "entryPermission";
  __fields__: EntryPermissionFields;
  /**
   * **Role** (ConnectionField)
   *
   * **EntryType** `userRole`
   * @description The user role this permission applies to
   * @type {string}
   * @required true
   */
  $role: string;
  /**
   * **Entry** (ConnectionField)
   *
   * **EntryType** `entryMeta`
   * @description The entry type this permission applies to
   * @type {string}
   * @required true
   */
  $entryMeta: string;
  /**
   * **Can View** (BooleanField)
   * @type {boolean}
   */
  $canView: boolean;
  /**
   * **Can Modify** (BooleanField)
   * @type {boolean}
   */
  $canModify: boolean;
  /**
   * **Can Create** (BooleanField)
   * @type {boolean}
   */
  $canCreate: boolean;
  /**
   * **Can Delete** (BooleanField)
   * @type {boolean}
   */
  $canDelete: boolean;
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
   * @description Tags associated with this Entry Permission
   * @type {Array<any>}
   */
  $in__tags?: Array<any>;
  /**
   * **Role Title** (DataField)
   * @type {string}
   */
  $role__title?: string;
  /**
   * **Entry Title** (DataField)
   * @type {string}
   */
  $entryMeta__title?: string;
  isFieldModified(
    fieldKey: keyof {
      [K in keyof EntryPermission as K extends keyof EntryBase ? never : K]: K;
    },
  ): boolean;
  $fieldPermissions: ChildList<{
    /**
     * **Field** (ConnectionField)
     *
     * **EntryType** `fieldMeta`
     * @type {string}
     * @required true
     */
    field: string;
    /**
     * **Can View** (BooleanField)
     * @type {boolean}
     */
    canView: boolean;
    /**
     * **Can Modify** (BooleanField)
     * @type {boolean}
     */
    canModify: boolean;
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
     * **EntryType** `entryPermission`
     * @type {string}
     * @required true
     */
    parent: string;
    /**
     * **Field Title** (DataField)
     * @type {string}
     */
    field__title?: string;
  }>;
};
