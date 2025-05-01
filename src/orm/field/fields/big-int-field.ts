import { ORMField } from "#/orm/field/orm-field.ts";

export default new ORMField("BigIntField", {
  dbColumn: (fieldDef) => {
    return {
      columnName: fieldDef.key,
      dataType: "bigint",
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
