import { ORMFieldDef } from "#orm/types";

export default [{
  key: "user",
  label: "User",
  type: "ConnectionField",
  entryType: "user",
}] satisfies Array<ORMFieldDef>;
