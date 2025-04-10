import { ORMField } from "#/field/orm-field.ts";

export default new ORMField("CurrencyField", {
  dbColumn: (fieldDef) => {
    return {
      columnName: fieldDef.key,
      dataType: "numeric",
      numericPrecision: 2,
      numericScale: 2,
    };
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
