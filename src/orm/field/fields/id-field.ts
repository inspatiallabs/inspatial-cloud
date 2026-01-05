import { ORMFieldConfig } from "~/orm/field/orm-field.ts";
import type { PgColumnDefinition } from "~/orm/db/db-types.ts";

export default new ORMFieldConfig("IDField", {
  dbColumn: (fieldDef) => {
    const pgColumn: PgColumnDefinition = {
      columnName: fieldDef.key,
      dataType: "text",
      isNullable: "NO",
      isIdentity: true,
    };
    switch (fieldDef.idMode) {
      case "ulid":
        pgColumn.dataType = "character varying",
          pgColumn.characterMaximumLength = 26;
        break;
      case "auto":
        pgColumn.dataType = "integer";
        break;
      case "uuid":
        pgColumn.dataType = "text";
        break;
    }
    return pgColumn;
  },
  dbLoad(value, _fieldDef) {
    return value;
  },
  validate(_value, _fieldDef) {
    return true;
  },
  dbSave(value, _fieldDef) {
    return value;
  },
}) as ORMFieldConfig<"IDField">;
