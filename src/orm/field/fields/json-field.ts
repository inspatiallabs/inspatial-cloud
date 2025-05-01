import { ORMField } from "#/orm/field/orm-field.ts";

export default new ORMField("JSONField", {
  dbColumn: (fieldDef) => {
    return {
      columnName: fieldDef.key,
      dataType: "jsonb",
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
