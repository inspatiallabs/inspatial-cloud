interface EntryBase {
  _name: string;
  createdAt: number;
  /**
   * **Updated At** (TimeStampField)
   * @description The date and time this entry was last updated
   * @type {number}
   * @required true
   */
  updatedAt: number;
  /**
   * **First Name** (DataField)
   * @description The user's first name
   * @type {string}
   * @required true
   */

  save(): Promise<void>;
  /**
   * Updates the entry with the provided data. This is the preferred way to update an entry,
   * as it will only update the fields that are allowed to be changed.
   * **Note:** This does not save the entry to the database. You must call the save method to do that.
   */
  update(data: Record<string, any>): void;
  canCreate: boolean;
  canModify: boolean;
  canView(): boolean;
  canDelete(): boolean;
  assertCreatePermission(): void;
  assertModifyPermission(): void;
  assertViewPermission(): void;
  assertDeletePermission(): void;
  isFieldModified(fieldName: string): boolean;
}

type BuiltInFields =
  | "id"
  | "createdAt"
  | "updatedAt"
  | "parent"
  | "order"
  | `${string}__title`;

interface ChildList<T extends Record<string, unknown>> {
  _name: string;
  rowsToRemove: Set<string>;
  _tableName: string;
  _parentId: string;
  _getFieldType: (
    fieldType: string,
  ) => any;

  data(): Array<T>;
  load(parentId: string): Promise<void>;
  /**
   * Deletes all child records for the current parent ID.
   */
  clear(): Promise<void>;
  deleteStaleRecords(): Promise<void>;
  update(data: Array<T>): void;
  getChild(id: string): T;

  add(data: Omit<T, BuiltInFields>): void;
  /** Returns the number of children, including unsaved ones */
  count: number;
  countNew(): number;
  countExisting(): number;
  save(withParentId?: string): Promise<void>;
}
