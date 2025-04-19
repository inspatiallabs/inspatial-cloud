import { ORMField } from "#/orm/field/orm-field.ts";

export default new ORMField("TimeStampField", {
  dbColumn: (fieldDef) => {
    return {
      columnName: fieldDef.key,
      dataType: "timestamp with time zone",
    };
  },
  dbLoad(value, fieldDef) {
    return value;
  },
  validate(value, fieldDef) {
    return true;
  },
  dbSave(value, fieldDef) {
    value = new Date(value).toUTCString();
    if (value === "Invalid Date") {
      value = null;
    }
    return value;
  },
});
