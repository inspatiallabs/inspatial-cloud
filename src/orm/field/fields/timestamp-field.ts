import { ORMFieldConfig } from "~/orm/field/orm-field.ts";

export default new ORMFieldConfig("TimeStampField", {
  dbColumn: (fieldDef) => {
    return {
      columnName: fieldDef.key,
      dataType: "timestamp with time zone",
    };
  },
  dbLoad(value, _fieldDef) {
    return value;
  },
  validate(_value, _fieldDef) {
    return true;
  },
  dbSave(value, _fieldDef) {
    value = new Date(value).toUTCString();
    if (value === "Invalid Date") {
      value = null;
    }
    return value;
  },
});
