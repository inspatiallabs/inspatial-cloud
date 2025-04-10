import { ORMField } from "#/field/orm-field.ts";

export default new ORMField("BooleanField", {
  dbColumn: (fieldDef) => {
    return {
      columnName: fieldDef.key,
      dataType: "boolean",
      columnDefault: false,
    };
  },
  dbLoad(value, fieldDef) {
    return value;
  },
  validate(value, fieldDef) {
    return true;
  },
  normalize(value, fieldDef) {
    switch (value) {
      case true:
      case "true":
      case 1:
      case "1":
        value = true;
        break;
      case false:
      case "false":
      case 0:
      case "0":
        value = false;
    }
    return value;
  },
  dbSave(value, fieldDef) {
    return value;
  },
});
