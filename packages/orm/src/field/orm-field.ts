import { FieldDefMap, FieldDefType, ORMFieldMap } from "#/field/types.ts";
import { PgColumnDefinition } from "#db/types.ts";

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
  }

  generateDbColumn(fieldDef: FieldDefMap[T]): PgColumnDefinition {
    return this.#dbColumn(fieldDef);
  }
  parseDbValue(value: any, fieldDef: FieldDefMap[T]): ORMFieldMap[T] {
    return this.#dbLoad(value, fieldDef);
  }

  validate(value: any, fieldDef: FieldDefMap[T]): boolean {
    return this.#validate(value, fieldDef);
  }

  prepareForDB(
    value: ORMFieldMap[T],
    fieldDef: FieldDefMap[T],
  ): ORMFieldMap[T] {
    return this.#dbSave(value, fieldDef);
  }
}
