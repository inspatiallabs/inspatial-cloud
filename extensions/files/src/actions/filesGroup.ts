import { CloudAPIGroup } from "#/api/cloud-group.ts";
import getFileAction from "#extensions/files/src/actions/getFile.ts";
import uploadFileAction from "#extensions/files/src/actions/uploadFile.ts";

const filesGroup = new CloudAPIGroup("files", {
  label: "Files",
  description: "File Management",
  actions: [getFileAction, uploadFileAction],
});

export default filesGroup;
