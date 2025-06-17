import type { InField } from "#/orm/field/field-def-types.ts";

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
  description: "The user's full name (automatically generated)",
  readOnly: true,
}, {
  key: "profilePicture",
  type: "ImageField",
  label: "Profile Picture",
  allowedImageTypes: ["png", "jpeg", "svg+xml", "png"],
  description: "The user's profile picture",
}, {
  key: "password",
  type: "PasswordField",
  label: "Password",
  hidden: true,
  description: "The user's password used for login",
}, {
  key: "resetPasswordToken",
  label: "Reset Password Token",
  type: "PasswordField",
  description: "The token used to reset the user's password",
  readOnly: true,
  hidden: true,
}, {
  key: "systemAdmin",
  label: "System Administrator",
  type: "BooleanField",
  readOnly: true,
  description:
    "Is the user a system administrator? (admin users have access to all parts of the system)",
}, {
  key: "apiToken",
  label: "API Token",
  type: "PasswordField",
  description: "The user's API token",
  readOnly: true,
}] as Array<InField>;
