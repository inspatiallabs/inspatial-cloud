import { ORMField } from "#/field/orm-field.ts";

export default new ORMField("TextField", {
  dbColumn: (fieldDef) => {
    return {
      columnName: fieldDef.key,
      dataType: "text",
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
