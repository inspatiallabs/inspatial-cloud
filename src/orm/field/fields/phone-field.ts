import { ORMFieldConfig } from "~/orm/field/orm-field.ts";
import { Country } from "../../../countries/country-code.ts";

export default new ORMFieldConfig("PhoneField", {
  dbColumn: (fieldDef) => {
    return {
      columnName: fieldDef.key,
      dataType: "text",
    };
  },
  dbLoad(value, _fieldDef) {
    return value;
  },
  validate(_value, _fieldDef) {
    return true;
  },
  normalize(value, fieldDef) {
    let stValue: string = "";
    if (value === null || value === undefined) {
      return value;
    }
    switch (typeof value) {
      case "string":
        stValue = value;
        break;
      default:
        stValue = `${value}`;
    }
    stValue = stValue.replace(/[^0-9+]/g, "");
    if (!fieldDef.country) {
      return stValue;
    }
    const cc = Country[fieldDef.country].CC;
    if (stValue.startsWith(`+${cc}`)) {
      return stValue;
    }
    if (stValue.startsWith("+")) {
      return stValue;
    }
    if (stValue[0] === "0") {
      return stValue.replace(/^0/, `+${cc}`);
    }
    return `+${cc}${stValue}`;
  },
  dbSave(value, _fieldDef) {
    return value;
  },
});
