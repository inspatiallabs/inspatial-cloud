import { CloudAPIAction } from "~/api/cloud-action.ts";
import type { CloudFile } from "../entries/_cloud-file.type.ts";
import MimeTypes from "../mime-types/mime-types.ts";
import type { GlobalCloudFile } from "../entries/_global-cloud-file.type.ts";
import { joinPath } from "~/utils/path-utils.ts";
export const uploadFile = new CloudAPIAction("upload", {
  label: "Upload File",
  raw: true,
  params: [{
    key: "global",
    type: "BooleanField",
  }, {
    key: "publicFile",
    type: "BooleanField",
  }, {
    key: "optimizeImage",
    type: "BooleanField",
  }, {
    key: "optimizeWidth",
    type: "IntField",
  }, {
    key: "optimizeHeight",
    type: "IntField",
  }, {
    key: "optimizeFormat",
    type: "DataField",
  }],
  async run(
    {
      inCloud,
      orm,
      inRequest,
      inResponse,
      params: {
        global,
        publicFile,
        optimizeImage,
        optimizeHeight,
        optimizeWidth,
        optimizeFormat,
      },
    },
  ) {
    const formData = await inRequest.request.formData();
    const file = formData.get("content") as File;
    const fileName = formData.get("fileName") as string;
    let cloudFile: CloudFile | GlobalCloudFile;
    let accountId = orm._user!.accountId;
    switch (global) {
      case true:
        cloudFile = orm.getNewEntry<GlobalCloudFile>("globalCloudFile");
        accountId = "global";
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
    let accountFolder = joinPath(inCloud.filesPath, accountId);
    let path = joinPath(accountFolder, newFileName);
    if (publicFile) {
      accountFolder = joinPath(inCloud.publicFilesPath, accountId);
      path = joinPath(accountFolder, newFileName);
    }
    const originalFolder = joinPath(accountFolder, "original");
    await Deno.mkdir(originalFolder, {
      recursive: true,
    });
    cloudFile.filePath = path;
    if (optimizeImage) {
      path = joinPath(originalFolder, newFileName);
      const defaultSize = 1000;
      cloudFile.optimizeImage = true;
      cloudFile.optimizeWidth = optimizeWidth || defaultSize;
      cloudFile.optimizeHeight = optimizeHeight || defaultSize;
      cloudFile.optimizeFormat = "jpeg";
      cloudFile.optimized = false;
      if (optimizeFormat && ["jpeg", "png"].includes(optimizeFormat)) {
        cloudFile.optimizeFormat = optimizeFormat as "jpeg" | "png";
      }
    }
    await Deno.writeFile(path, stream, {
      create: true,
    });
    await cloudFile.save();
    inResponse.setContent({
      file: cloudFile.data,
    });
    return inResponse.respond();
  },
});
