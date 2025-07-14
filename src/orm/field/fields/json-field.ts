import { ORMFieldConfig } from "~/orm/field/orm-field.ts";

export default new ORMFieldConfig("JSONField", {
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
  normalize(value, _fieldDef) {
    return value;
  },
  dbSave(value, _fieldDef) {
    if (typeof value === "undefined" || value === null) {
      return null; // Handle undefined or null values
    }
    return JSON.stringify(value); // Ensure value is serializable
  },
});
