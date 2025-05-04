import type { InField } from "#/orm/field/field-def-types.ts";

export const googleFields: Array<InField> = [{
  key: "googleClientId",
  type: "TextField",
  label: "Google Client ID",
  description: "The client ID for Google authentication.",
  defaultValue: "",
}, {
  key: "googleClientSecret",
  type: "PasswordField",
  label: "Google Client Secret",
  description: "The client secret for Google authentication.",
  defaultValue: "",
}, {
  key: "hostname",
  type: "URLField",
  label: "Hostname",
  description:
    "The hostname for the server used to construct the redirect URL.",
  defaultValue: "https://localhost:8000",
}];
