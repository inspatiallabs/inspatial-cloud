import type { ORMFieldMap } from "#/orm/field/types.ts";
import type { PgColumnDefinition } from "#/orm/db/db-types.ts";
import type { FieldDefMap, FieldDefType } from "#/orm/field/field-def-types.ts";

/**
 * A class that represents a field type configuration for InSpatial ORM.
 */
export class ORMField<T extends FieldDefType = FieldDefType> {
  readonly type: T;
  description?: string;
  #dbLoad: (value: any, fieldDef: FieldDefMap[T]) => ORMFieldMap[T];
  #validate: (value: any, fieldDef: FieldDefMap[T]) => boolean;
  #dbSave: (value: any, fieldDef: FieldDefMap[T]) => any;
  #dbColumn: (fieldDef: FieldDefMap[T]) => PgColumnDefinition;
  #normalize: (value: any, fieldDef: FieldDefMap[T]) => ORMFieldMap[T];

  constructor(fieldType: T, config: {
    description?: string;
    dbColumn: (fieldDef: FieldDefMap[T]) => PgColumnDefinition;

    /**
     * A parser function that will be used to load the field from
     * the database and convert it to the correct format.
     */
    dbLoad: (value: any, fieldDef: FieldDefMap[T]) => ORMFieldMap[T];
    /**
     * A validator function that will be used to validate the field
     * before saving it to the database.
     */

    validate: (value: any, fieldDef: FieldDefMap[T]) => boolean;

    /**
     * A normalizer function that will be used to convert the field
     * to the correct/normalized orm format when being set on the entry.
     */
    normalize?: (value: any, fieldDef: FieldDefMap[T]) => ORMFieldMap[T];
    /**
     * A parser function that will be used to save the field to the
     * database in the correct format once it has been validated.
     */
    dbSave: (value: any, fieldDef: FieldDefMap[T]) => any;
  }) {
    this.type = fieldType;
    this.#dbLoad = config.dbLoad;
    this.#validate = config.validate;
    this.#dbSave = config.dbSave;
    this.#dbColumn = config.dbColumn;
    this.#normalize = (value: any, _fieldDef: FieldDefMap[T]) => value;
    if (config.normalize) {
      this.#normalize = config.normalize;
    }
  }

  generateDbColumn(fieldDef: FieldDefMap[T]): PgColumnDefinition {
    const dbColumn: PgColumnDefinition = {
      isNullable: fieldDef.required ? "NO" : "YES",
      columnDefault: fieldDef.defaultValue,
      ...this.#dbColumn(fieldDef),
    };
    if (fieldDef.unique) {
      dbColumn.unique = true;
    }

    return dbColumn;
  }
  parseDbValue(value: unknown, fieldDef: FieldDefMap[T]): ORMFieldMap[T] {
    return this.#dbLoad(value, fieldDef);
  }

  validate(value: unknown, fieldDef: FieldDefMap[T]): boolean {
    return this.#validate(value, fieldDef);
  }

  normalize(value: unknown, fieldDef: FieldDefMap[T]): ORMFieldMap[T] {
    return this.#normalize(value, fieldDef);
  }

  prepareForDB(
    value: ORMFieldMap[T],
    fieldDef: FieldDefMap[T],
  ): ORMFieldMap[T] {
    return this.#dbSave(value, fieldDef);
  }
}
