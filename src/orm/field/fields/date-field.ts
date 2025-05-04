import { ORMFieldConfig } from "#/orm/field/orm-field.ts";

export default new ORMFieldConfig("DateField", {
  dbColumn: (fieldDef) => {
    return {
      columnName: fieldDef.key,
      dataType: "date",
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
