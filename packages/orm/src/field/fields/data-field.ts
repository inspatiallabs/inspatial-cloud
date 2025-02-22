import { ORMField } from "#/field/orm-field.ts";

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
  validate(value) {
    return true;
  },
  dbSave(value) {
    return value;
  },
  normalize(value) {
    return value;
  },
});
