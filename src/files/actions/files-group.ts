import { CloudAPIGroup } from "~/api/cloud-group.ts";
import { getFile } from "./get-file.ts";
import { uploadFile } from "./upload-file.ts";

const filesGroup = new CloudAPIGroup("files", {
  label: "Files",
  description: "File Management",
  actions: [getFile, uploadFile],
});

export default filesGroup;
