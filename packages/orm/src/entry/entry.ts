import { EntryType } from "#/entry/entry-type.ts";
import { InSpatialOrm } from "#/inspatial-orm.ts";
import { InSpatialDB } from "#db";

import type { FieldDefMap, ORMFieldDef } from "#/field/types.ts";
import { raiseORMException } from "#/orm-exception.ts";
import { ORMField } from "#/field/orm-field.ts";

export class Entry {
  name: string;
  _orm: InSpatialOrm;
  _db: InSpatialDB;
  _data: Map<string, any>;
  _modifiedValues: Map<string, { from: any; to: any }> = new Map();
  _getFieldType<T extends keyof FieldDefMap>(fieldType: T): ORMField<T> {
    const fieldTypeDef = this._orm.fieldTypes.get(fieldType);
    if (!fieldTypeDef) {
      raiseORMException(
        `Field type ${fieldType} does not exist in ORM`,
      );
    }
    return fieldTypeDef as unknown as ORMField<T>;
  }
  _getField<T extends keyof FieldDefMap>(fieldKey: string): FieldDefMap[T] {
    const fieldDef = this._orm.entryTypes.get(this.name)?.fields.get(fieldKey);
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
  }

  async load(id: string) {}

  async save() {}

  async delete() {}

  update(data: Record<string, any>) {}
}
