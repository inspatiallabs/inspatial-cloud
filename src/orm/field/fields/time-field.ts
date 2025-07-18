import { ORMFieldConfig } from "~/orm/field/orm-field.ts";

export default new ORMFieldConfig("TimeField", {
  dbColumn: (fieldDef) => {
    return {
      columnName: fieldDef.key,
      dataType: "time",
    };
  },
  dbLoad(value, _fieldDef) {
    if (!value) return null;
    return value;
  },
  validate(_value, _fieldDef) {
    return true;
  },
  dbSave(value, _fieldDef) {
    return value;
  },
});
