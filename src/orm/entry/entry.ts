import { BaseClass } from "~/orm/shared/base-class.ts";
import type { EntryHookDefinition, IDValue } from "~/orm/entry/types.ts";
import type { EntryHookName } from "~/orm/orm-types.ts";
import type { EntryType } from "~/orm/entry/entry-type.ts";
import type { InSpatialORM } from "~/orm/inspatial-orm.ts";
import { raiseORMException } from "~/orm/orm-exception.ts";
import ulid from "~/orm/utils/ulid.ts";

import type { InCloud } from "~/in-cloud.ts";
import type { UserID } from "~/auth/types.ts";
import type { EntryPermission } from "~/orm/roles/entry-permissions.ts";
import { raiseCloudException } from "../../serve/exeption/cloud-exception.ts";

export class Entry<
  N extends string = string,
> extends BaseClass<N> {
  get id(): IDValue {
    return this._data.get("id");
  }

  get #isNew(): boolean {
    return this._data.get("id") === "_new_" || !this._data.has("id") ||
      this._data.get("id") === null;
  }
  readonly _entryType!: EntryType;
  _hooks: {
    [key in EntryHookName]?: Array<EntryHookDefinition>;
  } = {
    beforeValidate: [],
    validate: [],
    beforeCreate: [],
    afterCreate: [],
    beforeUpdate: [],
    afterUpdate: [],
    beforeDelete: [],
    afterDelete: [],
  };
  get permission(): EntryPermission {
    return this._entryType.permission;
  }

  get data(): Record<string, any> {
    this.assertViewPermission();
    const data = Object.fromEntries(this._data.entries());
    const childData: Record<string, any> = {};
    for (const [key, value] of this._childrenData.entries()) {
      childData[key] = value.data;
    }
    return {
      ...data,
      ...childData,
    };
  }

  constructor(
    config: {
      systemGlobal?: boolean;
      orm: InSpatialORM;
      inCloud: InCloud;
      name?: N;
      user: UserID;
    },
  ) {
    if (!config.name) {
      raiseCloudException("Entry name is required");
    }
    super({
      inCloud: config.inCloud,
      name: config.name,
      orm: config.orm,
      type: "entry",
      user: config.user,
      systemGlobal: config.systemGlobal,
    });
  }
  /**
   * Creates a new instance of this entry type, and sets all the fields to their default values.
   * Note: This does not save the entry to the database. You must call the save method to do that.
   */
  create(): void {
    this.assertCreatePermission();
    this._data.clear();
    for (const field of this._fields.values()) {
      if (
        field.readOnly || field.hidden
      ) {
        continue;
      }
      this[field.key as keyof this] = field.defaultValue === undefined
        ? null
        : field.defaultValue;
    }
    this._data.set("id", "_new_");
  }

  async load(id: IDValue): Promise<void> {
    this.assertViewPermission();
    this._data.clear();
    this._modifiedValues.clear();
    // Load the main table row
    const dbRow = await this._db.getRow(this._entryType.config.tableName, id);
    if (!dbRow) {
      raiseORMException(
        `${this._entryType.config.label} with id ${id} does not exist!`,
        "EntryNotFound",
        404,
      );
    }
    for (const [key, value] of Object.entries(dbRow)) {
      if (!this._fields.has(key)) {
        continue;
      }
      const fieldDef = this._getFieldDef(key);
      const fieldType = this._getFieldType(fieldDef.type);
      this._data.set(key, fieldType.parseDbValue(value, fieldDef));
    }

    await this.loadChildren(this.id as string);
  }

  async save(): Promise<void> {
    if (this.#isNew) {
      this.assertCreatePermission();
    }
    this.assertModifyPermission();
    await this.refreshFetchedFields();
    this["updatedAt" as keyof this] = Date.now() as any;
    switch (this.#isNew) {
      case true:
        this["createdAt" as keyof this] = Date.now() as any;
        await this.#beforeCreate();
        break;
      default:
        await this.#beforeUpdate();
    }
    await this.refreshFetchedFields();
    const data: Record<string, any> = {};
    for (const [key, value] of this._modifiedValues.entries()) {
      const fieldDef = this._getFieldDef(key);
      const fieldType = this._getFieldType(fieldDef.type);
      data[key] = fieldType.prepareForDB(value.to, fieldDef);
    }

    if (this.#isNew) {
      return await this.#insertNew(data);
    }

    // Update the main table row
    await this._db.updateRow(
      this._entryType.config.tableName,
      this.id,
      data,
    ).catch((e) => this.handlePGError(e));
    await this.saveChildren();
    await this.#afterUpdate();
    await this.load(this.id);
  }

  /**
   * Deletes the entry from the database
   */
  async delete(): Promise<boolean> {
    this.assertDeletePermission();
    await this.#beforeDelete();
    // Delete all children first
    await this.deleteChildren();
    await this._db.deleteRow(this._entryType.config.tableName, this.id);
    await this.#afterDelete();
    return true;
  }

  /**
   * Updates the entry with the provided data. This is the preferred way to update an entry,
   * as it will only update the fields that are allowed to be changed.
   * **Note:** This does not save the entry to the database. You must call the save method to do that.
   */
  update(data: Record<string, any>): void {
    this.assertModifyPermission();
    for (const [key, value] of Object.entries(data)) {
      if (this._childrenData.has(key)) {
        const childList = this._childrenData.get(key);
        if (childList) {
          childList._parentId = this.id as string;
          childList.update(value);
        }
        continue;
      }
      if (!this._changeableFields.has(key)) {
        continue;
      }
      this[key as keyof this] = value;
    }
  }

  isFieldModified(fieldName: string): boolean {
    this.assertViewPermission();
    return this._modifiedValues.has(fieldName);
  }
  /* Lifecycle Hooks */

  async #runHooks(hookName: EntryHookName): Promise<void> {
    for (const hook of this._entryType.hooks[hookName]) {
      await hook.handler({
        orm: this._orm,
        inCloud: this._inCloud,
        entry: this as any,
        [this._name]: this as any,
        [this._type]: this as any,
      });
    }
  }
  async #beforeValidate(): Promise<void> {
    await this.#runHooks("beforeValidate");
    await this._orm._runGlobalEntryHooks("beforeValidate", this);
  }
  async #validate(): Promise<void> {
    await this.#beforeValidate();
    await this.#runHooks("validate");
    await this._orm._runGlobalEntryHooks("validate", this);
  }
  async #beforeCreate(): Promise<void> {
    for (const field of this._fields.values()) {
      if (field.readOnly && field.required) {
        const value = this._data.get(field.key);
        if (value === undefined || value === null) {
          this[field.key as keyof this] = field.defaultValue;
        }
      }
    }
    await this.#validate();
    await this.#runHooks("beforeUpdate");
    await this.#runHooks("beforeCreate");
    await this._orm._runGlobalEntryHooks("beforeCreate", this);
  }
  async #afterCreate(): Promise<void> {
    await this.#runHooks("afterCreate");
    await this._orm._runGlobalEntryHooks("afterCreate", this);
  }
  async #beforeUpdate(): Promise<void> {
    for (const field of this._fields.values()) {
      if (field.readOnly && field.required) {
        const value = this._data.get(field.key);
        if (value === undefined || value === null) {
          this[field.key as keyof this] = field.defaultValue;
        }
      }
    }
    await this.#validate();
    await this.#runHooks("beforeUpdate");
    await this._orm._runGlobalEntryHooks("beforeUpdate", this);
  }
  async #afterUpdate(): Promise<void> {
    await this.#syncReferences();
    await this.#runHooks("afterUpdate");
    await this._orm._runGlobalEntryHooks("afterUpdate", this);
  }
  async #beforeDelete(): Promise<void> {
    await this.#runHooks("beforeDelete");
    await this._orm._runGlobalEntryHooks("beforeDelete", this);
  }
  async #afterDelete(): Promise<void> {
    await this.#runHooks("afterDelete");
    await this._orm._runGlobalEntryHooks("afterDelete", this);
  }
  /* End Lifecycle Hooks */
  async #insertNew(data: Record<string, any>): Promise<void> {
    const id = this.#generateId();

    if (id) {
      data["id"] = id;
    }
    const result = await this._db.insertRow(
      this._entryType.config.tableName,
      data,
    ).catch((e) => this.handlePGError(e));
    if (!result?.id) {
      return;
    }

    await this.saveChildren(result.id);
    await this.load(result.id);

    await this.#afterCreate();
  }
  #generateId(): string | undefined {
    const idMode = this._entryType.config.idMode;
    let id: string;
    switch (idMode) {
      case "auto":
        return undefined;
      case "ulid":
        id = ulid();
        break;
      case "uuid":
        id = crypto.randomUUID();
        break;
      default:
        raiseORMException(`Invalid idMode ${idMode}`);
    }
    return id;
  }

  async #syncReferences() {
    const entryRegistry = this._orm.getEntryTypeRegistry(
      this._name,
    );
    if (entryRegistry === undefined) {
      return;
    }
    for (const [fieldKey, registryFields] of entryRegistry.entries()) {
      if (!this._modifiedValues.has(fieldKey)) {
        continue;
      }

      for (const registryField of registryFields) {
        registryField;
        await this._orm.batchUpdateField(
          registryField.targetEntryType,
          registryField.targetValueField,
          this._modifiedValues.get(fieldKey)!.to,
          [{
            field: registryField.targetIdField,
            op: "=",
            value: this.id,
          }],
        );
      }
    }
  }
  get canCreate(): boolean {
    return this._entryType.permission.create;
  }
  get canModify(): boolean {
    return this._entryType.permission.modify;
  }
  get canView(): boolean {
    return this._entryType.permission.view;
  }
  get canDelete(): boolean {
    return this._entryType.permission.delete;
  }
  assertCreatePermission(): void {
    if (!this.canCreate) {
      raiseORMException(
        `You do not have permission to create a new ${this._entryType.config.label}`,
        "PermissionDenied",
        403,
      );
    }
  }
  assertModifyPermission(): void {
    if (!this.canModify) {
      raiseORMException(
        `You do not have permission to modify ${this._entryType.config.label} Entries`,
        "PermissionDenied",
        403,
      );
    }
  }
  assertViewPermission(): void {
    if (!this.canView) {
      raiseORMException(
        `You do not have permission to view ${this._entryType.config.label} Entries`,
        "PermissionDenied",
        403,
      );
    }
  }
  assertDeletePermission(): void {
    if (!this.canDelete) {
      raiseORMException(
        `You do not have permission to delete ${this._entryType.config.label} Entries`,
        "PermissionDenied",
        403,
      );
    }
  }
}
