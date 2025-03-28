import type { ORMFieldDef } from "#orm/types";

export default [{
  key: "user",
  label: "User",
  type: "ConnectionField",
  entryType: "user",
}] as Array<ORMFieldDef>;
