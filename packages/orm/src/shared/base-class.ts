import type { InSpatialORM } from "#/inspatial-orm.ts";
import type { InSpatialDB } from "#db/inspatial-db.ts";
import type { FieldDefMap, ORMFieldDef } from "#/field/field-def-types.ts";
import type { ORMField } from "#/field/orm-field.ts";
import { raiseORMException } from "#/orm-exception.ts";

export class BaseClass<N> {
  _name: N;
  _orm: InSpatialORM;
  _db: InSpatialDB;
  _data: Map<string, any>;
  _modifiedValues: Map<string, { from: any; to: any }> = new Map();
  _fields: Map<string, ORMFieldDef> = new Map();
  _changeableFields: Map<string, ORMFieldDef> = new Map();
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
}
