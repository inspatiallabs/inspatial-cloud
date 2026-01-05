import { defineSettings } from "~/orm/settings/settings-type.ts";

export const emailSettings = defineSettings("emailSettings", {
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
    {
      key: "welcomeTemplate",
      label: "Welcome Email Template",
      type: "ConnectionField",
      entryType: "emailTemplate",
    },
    {
      key: "resetPasswordTemplate",
      type: "ConnectionField",
      entryType: "emailTemplate",
    },
    { key: "enableGlobalHeader", type: "BooleanField" },
    { key: "emailHeaderContent", type: "CodeField", codeType: "html" },
    { key: "emailBodyTemplate", type: "CodeField", codeType: "html" },
    { key: "enableGlobalFooter", type: "BooleanField" },
    { key: "emailFooterContent", type: "CodeField", codeType: "html" },
  ],
  fieldGroups: [
    {
      key: "emailContent",
      fields: [
        "welcomeTemplate",
        "emailHeaderContent",
        "enableGlobalHeader",
        "emailFooterContent",
        "enableGlobalFooter",
      ],
    },
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
