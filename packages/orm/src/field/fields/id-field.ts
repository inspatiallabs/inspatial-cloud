import { ORMField } from "#/field/orm-field.ts";
import { PgColumnDefinition } from "#db/types.ts";

export default new ORMField("IDField", {
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
