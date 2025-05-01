import { ORMField } from "#/orm/field/orm-field.ts";

export default new ORMField("FileField", {
  dbColumn: (fieldDef) => {
    return {
      columnName: fieldDef.key,
      dataType: "character varying",
      characterMaximumLength: 26,
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
