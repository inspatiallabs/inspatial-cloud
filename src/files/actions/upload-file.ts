import { CloudAPIAction } from "~/api/cloud-action.ts";
import type { CloudFile } from "../entries/_cloud-file.type.ts";
import MimeTypes from "../mime-types/mime-types.ts";
import { GlobalCloudFile } from "../entries/_global-cloud-file.type.ts";
import { joinPath } from "@inspatial/cloud/utils";

export const uploadFile = new CloudAPIAction("upload", {
  label: "Upload File",
  raw: true,
  params: [{
    key: "global",
    type: "BooleanField",
  }, {
    key: "publicFile",
    type: "BooleanField",
  }],
  async run(
    { inCloud, orm, inRequest, inResponse, params: { global, publicFile } },
  ) {
    const formData = await inRequest.request.formData();
    const file = formData.get("content") as File;
    const fileName = formData.get("fileName") as string;
    let cloudFile: CloudFile | GlobalCloudFile;
    switch (global) {
      case true:
        cloudFile = orm.getNewEntry<GlobalCloudFile>("globalCloudFile");
        break;
      default:
        cloudFile = orm.getNewEntry<CloudFile>("cloudFile");
    }
    cloudFile.fileName = fileName;
    cloudFile.fileSize = file.size;
    cloudFile.mimeType = file.type as any;
    cloudFile.publicFile = publicFile;
    const extensionInfo = MimeTypes.getExtensionsByMimeType(file.type);
    if (extensionInfo) {
      cloudFile.fileType = extensionInfo.category;
      cloudFile.fileExtension = extensionInfo.extension as any;
      cloudFile.fileTypeDescription = extensionInfo.description;
    }
    cloudFile.filePath = "";
    await cloudFile.save();
    const id = cloudFile.id;
    const extension = fileName.split(".").pop();
    const newFileName = `${id}.${extension}`;
    const stream = file.stream();
    let path = joinPath(inCloud.filesPath, newFileName);
    if (publicFile) {
      path = joinPath(inCloud.publicFilesPath, newFileName);
    }
    await Deno.writeFile(path, stream, {
      create: true,
    });
    cloudFile.filePath = path;
    await cloudFile.save();
    inResponse.setContent({
      file: cloudFile.data,
    });
    return inResponse.respond();
  },
});
