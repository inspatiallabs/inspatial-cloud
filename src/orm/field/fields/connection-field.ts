import { ORMField } from "#/orm/field/orm-field.ts";
import type { PgColumnDefinition } from "#/orm/db/db-types.ts";

export default new ORMField("ConnectionField", {
  dbColumn: (fieldDef) => {
    const pgColumn: PgColumnDefinition = {
      columnName: fieldDef.key,
      dataType: "text",
    };
    switch (fieldDef.connectionIdMode) {
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
});
