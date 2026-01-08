import { ORMFieldConfig } from "~/orm/field/orm-field.ts";

export default new ORMFieldConfig("ArrayField", {
  dbColumn: (fieldDef) => {
    return {
      columnName: fieldDef.key,
      dataType: fieldDef.arrayType === "IntField" ? "integer" : "text",
      array: true,
    };
  },
  dbLoad(value, _fieldDef) {
    return value;
  },
  validate(value, fieldDef) {
    if (value === null || value === undefined) {
      return true;
    }
    if (!Array.isArray(value)) {
      return false;
    }
    for (const v of value) {
      switch (typeof v) {
        case "number":
          if (fieldDef.arrayType === "DataField") {
            return false;
          }
          break;
        case "string":
          if (fieldDef.arrayType === "IntField") {
            return false;
          }
          break;
        default:
          return false;
      }
    }
    return true;
  },
  dbSave(value, _fieldDef) {
    if (!Array.isArray(value)) {
      return null;
    }
    value = `{${value.join(",")}}`;
    return value;
  },
}) as ORMFieldConfig<"ArrayField">;
