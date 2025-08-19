import { CloudAPIAction } from "~/api/cloud-action.ts";

import type { CloudFile } from "../entries/_cloud-file.type.ts";
import type { GlobalCloudFile } from "../entries/_global-cloud-file.type.ts";
import { joinPath } from "../../utils/path-utils.ts";

export const getFile = new CloudAPIAction("getFile", {
  params: [{
    key: "fileId",
    label: "File ID",
    type: "DataField",
    required: true,
  }, {
    key: "global",
    label: "Global File",
    type: "BooleanField",
    description: "Whether the file is a global file",
  }, {
    key: "download",
    label: "Download",
    type: "BooleanField",
  }],
  async run({ inCloud, orm, params, inResponse }) {
    const { fileId, global } = params;
    const accountId = global ? "global" : `${orm._accountId}`;
    const accountAndFileId = `${accountId}/${fileId}`;
    let filePath = inCloud.inCache.getValue("getFileFiles", accountAndFileId);
    if (!filePath) {
      const file = await orm.getEntry<CloudFile | GlobalCloudFile>(
        global ? "globalCloudFile" : "cloudFile",
        fileId,
      );
      const fileName = file.filePath.split("/").pop() || "";

      filePath = joinPath(
        file.publicFile ? "public-files" : "files",
        accountId,
        fileName,
      );
      inCloud.inCache.setValue("getFileFiles", accountAndFileId, filePath);
    }
    return await inCloud.privateFiles.serveFromPath(filePath, inResponse);
  },
});
