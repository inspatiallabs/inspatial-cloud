import { EntryType } from "#/entry/entry-type.ts";
import { InSpatialORM } from "#/inspatial-orm.ts";
import { InSpatialDB } from "#db";

import type { FieldDefMap, ORMFieldDef } from "#/field/field-def-types.ts";
import { raiseORMException } from "#/orm-exception.ts";
import { ORMField } from "#/field/orm-field.ts";
import ulid from "#/utils/ulid.ts";
import { PgError } from "#db/postgres/pgError.ts";
import { PGErrorCode } from "#db/postgres/maps/errorMap.ts";
import { convertString } from "@inspatial/serve/utils";
import {
  EntryActionDefinition,
  EntryHookDefinition,
  IDValue,
} from "#/entry/types.ts";
import { EntryHookName } from "../../types.ts";
import { GenericEntry } from "#/entry/entry-base.ts";
import { ormLogger } from "#/logger.ts";

export class Entry<
  N extends string = string,
> {
  _name: N;
  get id(): IDValue {
    return this._data.get("id");
  }

  get #isNew() {
    return this._data.get("id") === "_new_" || !this._data.has("id") ||
      this._data.get("id") === null;
  }
  _actions: Map<string, EntryActionDefinition> = new Map();
  _orm: InSpatialORM;
  _db: InSpatialDB;
  _data: Map<string, any>;
  _modifiedValues: Map<string, { from: any; to: any }> = new Map();
  _fields: Map<string, ORMFieldDef> = new Map();
  _changeableFields: Map<string, ORMFieldDef> = new Map();
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
    if (!this._orm.entryTypes.has(this._name)) {
      raiseORMException(`EntryType ${this._name} does not exist in ORM`);
    }
    return this._orm.entryTypes.get(this._name)!;
  }
  get data(): Record<string, any> {
    return Object.fromEntries(this._data.entries());
  }
  _getFieldType<T extends keyof FieldDefMap>(fieldType: T): ORMField<T> {
    const fieldTypeDef = this._orm.fieldTypes.get(fieldType);
    if (!fieldTypeDef) {
      raiseORMException(
        `Field type ${fieldType} does not exist in ORM`,
      );
    }
    return fieldTypeDef as unknown as ORMField<T>;
  }
  _getFieldDef<T extends keyof FieldDefMap>(fieldKey: string): FieldDefMap[T] {
    const fieldDef = this._fields.get(fieldKey);
    if (!fieldDef) {
      raiseORMException(
        `Field with key ${fieldKey} does not exist in EntryType ${this._name}`,
      );
    }
    return fieldDef as unknown as FieldDefMap[T];
  }

  constructor(orm: InSpatialORM, name: N) {
    this._name = name;
    this._orm = orm;
    this._db = orm.db;
    this._data = new Map();
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
      this._data.set(
        field.key,
        field.defaultValue === undefined ? null : field.defaultValue,
      );
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
      const fieldDef = this._entryType.fields.get(key);
      if (!fieldDef) {
        raiseORMException(
          `Field with key ${key} does not exist in EntryType ${this._name}`,
        );
      }
      const fieldType = this._getFieldType(fieldDef.type);
      this._data.set(key, fieldType.parseDbValue(value, fieldDef));
    }
  }

  async save(): Promise<void> {
    this["updatedAt" as keyof this] = Date.now() as any;
    switch (this.#isNew) {
      case true:
        this["createdAt" as keyof this] = Date.now() as any;
        await this.#beforeCreate();
        break;
      default:
        await this.#beforeUpdate();
    }

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
    ).catch((e) => this.#handlePGError(e));
    // Reload the entry to get the updated values
    await this.load(this.id);
    await this.#afterUpdate();
  }

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
  update(data: Record<string, any>) {
    for (const [key, value] of Object.entries(data)) {
      if (!this._changeableFields.has(key)) {
        continue;
      }
      this[key as keyof this] = value;
    }
  }
  /* Lifecycle Hooks */

  async #runHooks(hookName: EntryHookName) {
    for (const hook of this._entryType.hooks[hookName]) {
      await hook.handler({
        orm: this._orm,
        entry: this as any,
        [this._entryType.name]: this as any,
      });
    }
  }
  async #beforeValidate() {
    await this.#runHooks("beforeValidate");
    await this._orm._runGlobalHooks("beforeValidate", this);
  }
  async #validate() {
    await this.#beforeValidate();
    await this.#runHooks("validate");
    await this._orm._runGlobalHooks("validate", this);
  }
  async #beforeCreate() {
    await this.#validate();
    await this.#runHooks("beforeUpdate");
    await this.#runHooks("beforeCreate");
    await this._orm._runGlobalHooks("beforeCreate", this);
  }
  async #afterCreate() {
    await this.#runHooks("afterCreate");
    await this._orm._runGlobalHooks("afterCreate", this);
  }
  async #beforeUpdate() {
    await this.#validate();
    await this.#runHooks("beforeUpdate");
    await this._orm._runGlobalHooks("beforeUpdate", this);
  }
  async #afterUpdate() {
    await this.#runHooks("afterUpdate");
    await this._orm._runGlobalHooks("afterUpdate", this);
  }
  async #beforeDelete() {
    await this.#runHooks("beforeDelete");
    await this._orm._runGlobalHooks("beforeDelete", this);
  }
  async #afterDelete() {
    await this.#runHooks("afterDelete");
    await this._orm._runGlobalHooks("afterDelete", this);
  }
  /* End Lifecycle Hooks */
  async #insertNew(data: Record<string, any>) {
    const id = this.#generateId();

    if (id) {
      data["id"] = id;
    }
    const result = await this._db.insertRow(
      this._entryType.config.tableName,
      data,
    ).catch((e) => this.#handlePGError(e));
    if (!result?.id) {
      return;
    }
    await this.load(result.id);

    await this.#afterCreate();
  }
  #generateId() {
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
  #getAndValidateAction(actionKey: string, data?: Record<string, any>) {
    const dataMap = new Map(Object.entries(data || {}));
    const action = this._actions.get(actionKey);
    if (!action) {
      raiseORMException(
        `Action ${actionKey} not found in entry type ${this._entryType.name}`,
      );
    }
    if (action.params) {
      for (const param of action.params) {
        if (param.required && !dataMap.has(param.key)) {
          raiseORMException(
            `Missing required param ${param.key} for action ${actionKey} in entry type ${this._entryType.name}`,
          );
        }
      }
    }
    return action;
  }
  #handlePGError(e: unknown) {
    if (!(e instanceof PgError)) {
      throw e;
    }

    switch (e.code) {
      case PGErrorCode.NotNullViolation: {
        const fieldKey = convertString(e.fullMessage.columnName, "camel");
        raiseORMException(
          `Field ${fieldKey} is required for ${this._entryType.config.label} entry`,
          "RequiredField",
          400,
        );
      }
    }
  }
  async runAction(
    actionKey: string,
    data?: Record<string, any>,
  ): Promise<any> {
    const action = this.#getAndValidateAction(actionKey, data);

    data = data || {};
    return await action.action({
      orm: this._orm,
      data,
      [this._name]: this as any,
      entry: this as any,
    });
  }
}
