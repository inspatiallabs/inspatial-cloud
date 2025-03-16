import { ORMField } from "#/field/orm-field.ts";
import { PgColumnDefinition } from "#db/types.ts";

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
  dbLoad(value, fieldDef) {
    return value;
  },
  validate(value, fieldDef) {
    return true;
  },
  dbSave(value, fieldDef) {
    return value;
  },
});
