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
    switch (fieldDef.idType) {
      case "hex16":
        pgColumn.dataType = "character varying",
          pgColumn.characterMaximumLength = 16;
        break;
      case "autoincrement":
        pgColumn.dataType = "integer";

        pgColumn.columnDefault = "nextval('autoincrement')";
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
