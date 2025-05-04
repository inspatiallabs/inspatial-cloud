import type { InField } from "#/orm/field/field-def-types.ts";

const googleFields: Array<InField> = [{
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
  choices: [{
    key: "authenticated",
    label: "Authenticated",
  }, {
    key: "notAuthenticated",
    label: "Not Authenticated",
  }],
}];

export default googleFields;

// {
//   iss: "https://accounts.google.com",
//   azp: "538529504652-iugvmbuo5pb4l5n49t0jb1ovsv74n5pr.apps.googleusercontent.com",
//   aud: "538529504652-iugvmbuo5pb4l5n49t0jb1ovsv74n5pr.apps.googleusercontent.com",
//   sub: "104807230788901828838",
//   hd: "veracityads.com",
//   email: "eli@veracityads.com",
//   email_verified: true,
//   at_hash: "cIZwyAv8CxhijJ1vwVDg2Q",
//   nonce: "7552e41ab02c194834c7dbecbc71a2",
//   name: "Eli Veffer",
//   picture: "https://lh3.googleusercontent.com/a/ACg8ocL999oxLPSAPQVW67zI3jEzM9-I_-wnbJNaVjZvN3bkHxM2lTI=s96-c",
//   given_name: "Eli",
//   family_name: "Veffer",
//   iat: 1743686082,
//   exp: 1743689682
// }
