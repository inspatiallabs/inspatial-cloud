import type { InField } from "~/orm/field/field-def-types.ts";

export const googleFields: Array<InField> = [{
  key: "googleAccessToken",
  type: "PasswordField",
  label: "Access Token",
  description: "The access token used to authenticate the user with Google.",
  readOnly: true,
  hidden: true,
}, {
  key: "googleRefreshToken",
  type: "PasswordField",
  label: "Refresh Token",
  description: "The refresh token used to refresh the access token.",
  readOnly: true,
  hidden: true,
}, {
  key: "googleCredential",
  type: "JSONField",
  label: "Google Credential",
  description: "The credential used to authenticate the user with Google.",
  readOnly: true,
  hidden: true,
}, {
  key: "googleId",
  type: "TextField",
  label: "Google ID",
  description: "The user's Google ID.",
  readOnly: true,
  hidden: true,
}, {
  key: "googlePicture",
  type: "URLField",
  label: "Google Picture",
  description: "The user's Google profile picture.",
  readOnly: true,
}, {
  key: "googleAuthStatus",
  type: "ChoicesField",
  label: "Google Auth Status",
  readOnly: true,
  choices: [{
    key: "authenticated",
    label: "Authenticated",
  }, {
    key: "notAuthenticated",
    label: "Not Authenticated",
  }],
}];
