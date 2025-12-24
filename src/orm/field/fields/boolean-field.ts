import { ORMFieldConfig } from "~/orm/field/orm-field.ts";

export default new ORMFieldConfig("BooleanField", {
  dbColumn: (fieldDef) => {
    return {
      columnName: fieldDef.key,
      dataType: "boolean",
      columnDefault: false,
    };
  },
  dbLoad(value, _fieldDef) {
    return value;
  },
  validate(_value, _fieldDef) {
    return true;
  },
  normalize(value, _fieldDef) {
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
  dbSave(value, _fieldDef) {
    return value;
  },
}) as ORMFieldConfig<"BooleanField">;
