import { SettingsType } from "/orm/settings/settings-type.ts";

export const emailSettings = new SettingsType("emailSettings", {
  label: "Email Settings",
  description: "Settings for sending emails",
  fields: [
    {
      key: "clientId",
      label: "Client ID",
      type: "TextField",
    },
    {
      key: "clientSecret",
      label: "Client Secret",
      type: "TextField",
    },
    {
      key: "redirectHost",
      label: "Redirect Host",
      description:
        "The host to redirect to after Google OAuth (e.g. http://localhost:8000)",
      type: "URLField",
    },
    {
      key: "redirectFinal",
      label: "Final Redirect",
      type: "URLField",
      description: "The final url to redirect to after Google OAuth completes",
    },
    {
      key: "defaultSendAccount",
      label: "Default Send Account",
      type: "ConnectionField",
      entryType: "emailAccount",
      description: "The default email account to use for sending emails",
    },
    {
      key: "smtpHost",
      type: "TextField",
      label: "SMTP Host",
      description: "The host of the SMTP server",
      required: true,
    },
    {
      key: "smtpPort",
      type: "IntField",
      label: "SMTP Port",
      description: "The port of the SMTP server",
    },
    {
      key: "smtpUser",
      type: "DataField",
      label: "SMTP User",
      description: "The user to authenticate with the SMTP server",
    },
    {
      key: "smtpPassword",
      type: "PasswordField",
      label: "SMTP Password",
      description: "The password to authenticate with the SMTP server",
    },
  ],
  fieldGroups: [
    {
      key: "google",
      label: "Google Settings",
      description: "Settings for Google OAuth",
      fields: [
        "clientId",
        "clientSecret",
        "redirectHost",
        "redirectFinal",
      ],
    },
    {
      key: "smtp",
      label: "SMTP Settings",
      description: "Settings for SMTP server",
      fields: [
        "defaultSendAccount",
        "smtpHost",
        "smtpPort",
        "smtpUser",
        "smtpPassword",
      ],
    },
  ],
});
