import { CloudAPIAction } from "~/api/cloud-action.ts";
import type { CloudFile } from "../entries/_cloud-file.type.ts";
import MimeTypes from "../mime-types/mime-types.ts";

export const uploadFile = new CloudAPIAction("upload", {
  label: "Upload File",
  raw: true,
  params: [],
  async run({ inCloud, orm, inRequest, inResponse }) {
    const formData = await inRequest.request.formData();
    const file = formData.get("content") as File;
    const fileName = formData.get("fileName") as string;

    const cloudFile = orm.getNewEntry<CloudFile>("cloudFile");
    cloudFile.fileName = fileName;
    cloudFile.fileSize = file.size;
    cloudFile.mimeType = file.type as any;
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
    const path = `${inCloud.filesPath}/${newFileName}`;
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
