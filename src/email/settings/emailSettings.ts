import { SettingsType } from "~/orm/settings/settings-type.ts";
import type { EmailSettings } from "./_email-settings.type.ts";

export const emailSettings: SettingsType<EmailSettings> = new SettingsType<
  EmailSettings
>("emailSettings", {
  label: "Email Settings",
  description: "Settings for sending emails",
  systemGlobal: true,
  fields: [
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
  ],
  fieldGroups: [
    {
      key: "google",
      label: "Google Settings",
      description: "Settings for Google OAuth",
      fields: [
        "redirectFinal",
      ],
    },
    {
      key: "smtp",
      label: "SMTP Settings",
      description: "Settings for SMTP server",
      fields: [
        "defaultSendAccount",
      ],
    },
  ],
});
