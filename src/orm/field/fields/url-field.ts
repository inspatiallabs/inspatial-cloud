import { ORMFieldConfig } from "~/orm/field/orm-field.ts";

export default new ORMFieldConfig("URLField", {
  dbColumn: (fieldDef) => {
    return {
      columnName: fieldDef.key,
      dataType: "text",
    };
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
