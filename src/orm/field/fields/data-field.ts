import { ORMFieldConfig } from "#/orm/field/orm-field.ts";

export const dataField = new ORMFieldConfig("DataField", {
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
