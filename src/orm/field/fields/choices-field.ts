import { ORMFieldConfig } from "~/orm/field/orm-field.ts";

export default new ORMFieldConfig("ChoicesField", {
  dbColumn: (fieldDef) => {
    return {
      columnName: fieldDef.key,
      dataType: "text",
    };
  },
  dbLoad(value, _fieldDef) {
    return value;
  },
  validate(value, fieldDef) {
    const choiceKeys = new Set(fieldDef.choices.map((c) => c.key));
    if (value === null || value === undefined) {
      return true;
    }
    if (typeof value !== "string") {
      return false;
    }
    if (!choiceKeys.has(value)) {
      return `Value "${value}" is not a valid choice. Valid choices are: ${
        Array.from(choiceKeys).join(", ")
      }`;
    }
    return true;
  },
  normalize(value, _fieldDef) {
    if (typeof value === "string") {
      return value.trim();
    }
    return value;
  },
  dbSave(value, _fieldDef) {
    return value;
  },
});
