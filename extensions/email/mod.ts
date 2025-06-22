import { emailGroup } from "./actions/mod.ts";
import { emailAccountEntry } from "./entryTypes/emailAccountEntry.ts";
import { emailEntry } from "./entryTypes/emailEntry.ts";
import { emailSettings } from "./settingsTypes/emailSettings.ts";
import { CloudExtension } from "/app/cloud-extension.ts";

export const emailExtension: CloudExtension = new CloudExtension("email", {
  label: "Email",
  description: "Extension for sending and managing emails",
  actionGroups: [
    emailGroup,
  ],
  entryTypes: [emailEntry, emailAccountEntry],
  settingsTypes: [emailSettings],
});

// emailPack.addAction("email", sendEmailAction);
// emailPack.addAction("email", redirectAction);
