import { ORMFieldConfig } from "~/orm/field/orm-field.ts";

export default new ORMFieldConfig("CurrencyField", {
  dbColumn: (fieldDef) => {
    return {
      columnName: fieldDef.key,
      dataType: "numeric",
      numericPrecision: 12,
      numericScale: 2,
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
