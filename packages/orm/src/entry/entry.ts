import { EntryType } from "#/entry/entry-type.ts";
import { InSpatialOrm } from "#/inspatial-orm.ts";
import { InSpatialDB } from "#db";

import type { FieldDefMap, ORMFieldDef } from "#/field/types.ts";
import { raiseORMException } from "#/orm-exception.ts";
import { ORMField } from "#/field/orm-field.ts";
import { ormLogger } from "#/logger.ts";
import ulid from "#/utils/ulid.ts";

export class Entry {
  name: string;
  get id() {
    return this._data.get("id");
  }

  get #isNew() {
    return this._data.get("id") === "_new_" || !this._data.has("id") ||
      this._data.get("id") === null;
  }
  _orm: InSpatialOrm;
  _db: InSpatialDB;
  _data: Map<string, any>;
  _modifiedValues: Map<string, { from: any; to: any }> = new Map();
  _fields: Map<string, ORMFieldDef> = new Map();
  _changeableFields: Map<string, ORMFieldDef> = new Map();

  get _entryType(): EntryType {
    if (!this._orm.entryTypes.has(this.name)) {
      raiseORMException(`EntryType ${this.name} does not exist in ORM`);
    }
    return this._orm.entryTypes.get(this.name)!;
  }
  get data() {
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
        `Field with key ${fieldKey} does not exist in EntryType ${this.name}`,
      );
    }
    return fieldDef as unknown as FieldDefMap[T];
  }

  constructor(orm: InSpatialOrm, name: string) {
    this.name = name;
    this._orm = orm;
    this._db = orm.db;
    this._data = new Map();
  }
  /**
   * Creates a new instance of this entry type, and sets all the fields to their default values.
   * Note: This does not save the entry to the database. You must call the save method to do that.
   */
  async new() {
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

  async load(id: string) {
    this._data.clear();
    this._modifiedValues.clear();
    // Load the main table row
    const dbRow = await this._db.getRow(this._entryType.config.tableName, id);
    if (!dbRow) {
      raiseORMException(
        `${this._entryType.config.label} with id ${id} does not exist in table ${this._entryType.config.tableName}`,
      );
    }
    for (const [key, value] of Object.entries(dbRow)) {
      const fieldDef = this._entryType.fields.get(key);
      if (!fieldDef) {
        raiseORMException(
          `Field with key ${key} does not exist in EntryType ${this.name}`,
        );
      }
      const fieldType = this._getFieldType(fieldDef.type);
      this._data.set(key, fieldType.parseDbValue(value, fieldDef));
    }
  }

  async save() {
    this["updatedAt" as keyof this] = Date.now() as any;
    if (this.#isNew) {
      this["createdAt" as keyof this] = Date.now() as any;
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
    );
    // Reload the entry to get the updated values
    await this.load(this.id);
  }

  async delete() {
    await this._db.deleteRow(this._entryType.config.tableName, this.id);
    return true;
  }

  /**
   * Updates the entry with the provided data. This is the preferred way to update an entry,
   * as it will only update the fields that are allowed to be changed.
   * **Note:** This does not save the entry to the database. You must call the save method to do that.
   */
  update(data: Record<string, any>) {
    ormLogger.debug(data);
    for (const [key, value] of Object.entries(data)) {
      if (!this._changeableFields.has(key)) {
        continue;
      }
      this[key as keyof this] = value;
    }
  }
  async #insertNew(data: Record<string, any>) {
    const id = this.#generateId();

    if (id) {
      data["id"] = id;
    }
    const result = await this._db.insertRow(
      this._entryType.config.tableName,
      data,
    );
    await this.load(result.id);
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
}
