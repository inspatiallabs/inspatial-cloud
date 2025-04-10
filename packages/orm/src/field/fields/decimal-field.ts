import { ORMField } from "#/field/orm-field.ts";

export default new ORMField("DecimalField", {
  dbColumn: (fieldDef) => {
    return {
      columnName: fieldDef.key,
      dataType: "numeric",
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
