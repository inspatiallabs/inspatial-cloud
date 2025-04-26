import { CloudAPIAction } from "#/app/cloud-action.ts";
import type { CloudFile } from "#extensions/files/src/types/cloud-file.ts";

const uploadFileAction = new CloudAPIAction("upload", {
  label: "Upload File",
  raw: true,
  params: [],
  async run({ app, inRequest, inResponse }) {
    const formData = await inRequest.request.formData();
    const file = formData.get("content") as File;
    const fileName = formData.get("fileName") as string;

    const cloudFile = app.orm.getNewEntry<CloudFile>("cloudFile");
    cloudFile.fileName = fileName;
    cloudFile.fileSize = file.size;
    cloudFile.mimeType = file.type as any;
    cloudFile.filePath = "";
    await cloudFile.save();
    const id = cloudFile.id;
    const extension = fileName.split(".").pop();
    const newFileName = `${id}.${extension}`;
    const stream = file.stream();
    const path = `${app.filesPath}/${newFileName}`;
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

export default uploadFileAction;
