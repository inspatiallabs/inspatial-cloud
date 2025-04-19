import { ORMField } from "#/orm/field/orm-field.ts";

export const dataField = new ORMField("DataField", {
  dbColumn: (fieldDef) => {
    return {
      columnName: fieldDef.key,
      dataType: "character varying",
      characterMaximumLength: 255,
    };
  },
  dbLoad(value) {
    return value;
  },
  validate(_value) {
    return true;
  },
  dbSave(value) {
    return value;
  },
  normalize(value) {
    return value;
  },
});
