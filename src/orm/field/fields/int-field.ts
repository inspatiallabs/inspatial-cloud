import { ORMFieldConfig } from "~/orm/field/orm-field.ts";
/** */
export default new ORMFieldConfig("IntField", {
  dbColumn: (fieldDef) => {
    return {
      columnName: fieldDef.key,
      dataType: "integer",
    };
  },
  dbLoad(value, _fieldDef) {
    return value;
  },
  validate(_value, _fieldDef) {
    return true;
  },
  dbSave(value, _fieldDef) {
    if (value !== null && value !== undefined) {
      value = parseInt(value, 10);
      if (isNaN(value)) {
        value = null;
      }
    }

    return value;
  },
});
