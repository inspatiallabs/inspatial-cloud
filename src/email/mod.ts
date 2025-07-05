import { emailGroup } from "./actions/email-group.ts";
import { emailAccountEntry } from "~/email/entries/emailAccountEntry.ts";
import { emailEntry } from "~/email/entries/emailEntry.ts";
import { emailSettings } from "~/email/settings/emailSettings.ts";
import { CloudExtension } from "~/extension/cloud-extension.ts";

export const emailExtension: CloudExtension = new CloudExtension("email", {
  label: "Email",
  description: "Extension for sending and managing emails",
  actionGroups: [
    emailGroup,
  ],
  entryTypes: [emailEntry, emailAccountEntry],
  settingsTypes: [emailSettings],
});
