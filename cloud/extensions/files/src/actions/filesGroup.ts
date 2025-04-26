import { CloudAPIGroup } from "#/app/cloud-action.ts";
import getFileAction from "#extensions/files/src/actions/getFile.ts";
import uploadFileAction from "#extensions/files/src/actions/uploadFile.ts";

const filesGroup = new CloudAPIGroup("files", {
  label: "Files",
  description: "File Management",
  actions: [getFileAction, uploadFileAction],
});

export default filesGroup;
