import { ORMField } from "#/orm/field/orm-field.ts";

export default new ORMField("JSONField", {
  dbColumn: (fieldDef) => {
    return {
      columnName: fieldDef.key,
      dataType: "jsonb",
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
