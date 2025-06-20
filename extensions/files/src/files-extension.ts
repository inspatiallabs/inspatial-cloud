import { CloudExtension } from "/app/cloud-extension.ts";
import filesGroup from "#extensions/files/src/actions/filesGroup.ts";
import fileEntry from "#extensions/files/src/entry-types/file-entry.ts";

export const filesExtension = new CloudExtension("files", {
  label: "Files Extension",
  description: "File Management Extension",
  version: "0.0.1",
  actionGroups: [filesGroup],
  entryTypes: [fileEntry],
  settingsTypes: [],
});
