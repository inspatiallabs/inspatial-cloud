import { defineAPIAction } from "~/api/cloud-action.ts";

import { joinPath } from "../../utils/path-utils.ts";
import { raiseServerException } from "@inspatial/cloud";

export const getFile = defineAPIAction("getFile", {
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
  }, {
    key: "thumbnail",
    label: "Thumbnail",
    type: "BooleanField",
  }],
  async action({ inCloud, orm, params, inResponse }) {
    const { fileId, global, thumbnail, download } = params;
    const accountId = global ? "global" : `${orm._accountId}`;
    const accountAndFileId = `${accountId}/${
      thumbnail ? "thumb-" : ""
    }${fileId}`;
    let humanFileName = "";
    let filePath = inCloud.inCache.getValue("getFileFiles", accountAndFileId);
    if (!filePath) {
      const file = await orm.getEntry(
        global ? "globalCloudFile" : "cloudFile",
        fileId,
      );
      humanFileName = file.$fileName;
      if (file.$optimizeImage && !file.$optimized) {
        raiseServerException(404, "File not optimized yet");
      }
      let fileName = "";
      if (thumbnail && file.$optimizeImage) {
        fileName = file.$thumbnailPath
          ? file.$thumbnailPath.split("/").pop() || ""
          : "";
        if (!file.$thumbnailPath) {
          raiseServerException(404, "Thumbnail not found");
        }
      } else {
        fileName = file.$filePath.split("/").pop() || "";
      }

      filePath = joinPath(
        file.$publicFile ? "public-files" : "files",
        accountId,
        fileName,
      );
      inCloud.inCache.setValue("getFileFiles", accountAndFileId, filePath);
    }
    return await inCloud.privateFiles.serveFromPath(filePath, inResponse, {
      download: download === true,
      fileName: humanFileName || undefined,
    });
  },
});
