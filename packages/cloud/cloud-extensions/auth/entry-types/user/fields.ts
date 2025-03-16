import { ORMFieldDef } from "../../../../../orm/src/field/field-def-types.ts";

export default [{
  key: "firstName",
  type: "DataField",
  label: "First Name",
  description: "The user's first name",
  required: true,
}, {
  key: "lastName",
  type: "DataField",
  label: "Last Name",
  description: "The user's last names",
  required: true,
}, {
  key: "email",
  type: "EmailField",
  label: "Email",
  description: "The user's email address used for login",
  required: true,
  unique: true,
}, {
  key: "fullName",
  type: "DataField",
  label: "Full Name",
  description: "The user's password used for login",
  readOnly: true,
}] satisfies Array<ORMFieldDef>;
