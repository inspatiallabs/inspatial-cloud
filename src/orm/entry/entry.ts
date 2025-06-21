import { BaseClass } from "/orm/shared/base-class.ts";
import type { EntryHookDefinition, IDValue } from "/orm/entry/types.ts";
import type { EntryHookName } from "/orm/orm-types.ts";
import type { EntryType } from "/orm/entry/entry-type.ts";
import type { InSpatialORM } from "/orm/inspatial-orm.ts";
import { ORMException, raiseORMException } from "/orm/orm-exception.ts";
import ulid from "/orm/utils/ulid.ts";

import { inLog } from "../../in-log/in-log.ts";
import type { InCloud } from "../../cloud/cloud-common.ts";

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
  get _entryType(): EntryType {
    return this._orm.getEntryType(this._name);
  }
  get data(): Record<string, any> {
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

  constructor(orm: InSpatialORM, inCloud: InCloud, name: N, user?: any) {
    super(orm, inCloud, name, "entry", user);
  }
  /**
   * Creates a new instance of this entry type, and sets all the fields to their default values.
   * Note: This does not save the entry to the database. You must call the save method to do that.
   */
  create(): void {
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
      try {
        const fieldDef = this._getFieldDef(key);
        const fieldType = this._getFieldType(fieldDef.type);
        this._data.set(key, fieldType.parseDbValue(value, fieldDef));
      } catch (e) {
        if (e instanceof ORMException && e.responseCode === 404) {
          inLog.warn(`${e.message} but was loaded from the database`, {
            subject: e.subject,
          });
          continue;
        }
        throw e;
      }
    }

    await this.loadChildren(this.id as string);
  }

  async save(): Promise<void> {
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
    // Reload the entry to get the updated values
    await this.load(this.id);
  }

  /**
   * Deletes the entry from the database
   */
  async delete(): Promise<boolean> {
    await this.#beforeDelete();
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
    await this._orm._runGlobalHooks("beforeValidate", this);
  }
  async #validate(): Promise<void> {
    await this.#beforeValidate();
    await this.#runHooks("validate");
    await this._orm._runGlobalHooks("validate", this);
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
    await this._orm._runGlobalHooks("beforeCreate", this);
  }
  async #afterCreate(): Promise<void> {
    await this.#runHooks("afterCreate");
    await this._orm._runGlobalHooks("afterCreate", this);
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
    await this._orm._runGlobalHooks("beforeUpdate", this);
  }
  async #afterUpdate(): Promise<void> {
    await this.#syncReferences();
    await this.#runHooks("afterUpdate");
    await this._orm._runGlobalHooks("afterUpdate", this);
  }
  async #beforeDelete(): Promise<void> {
    await this.#runHooks("beforeDelete");
    await this._orm._runGlobalHooks("beforeDelete", this);
  }
  async #afterDelete(): Promise<void> {
    await this.#runHooks("afterDelete");
    await this._orm._runGlobalHooks("afterDelete", this);
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
    const entryRegistry = this._orm.registry.getEntryTypeRegistry(this._name);
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
}
