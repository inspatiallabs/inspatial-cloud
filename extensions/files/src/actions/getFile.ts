import { CloudAPIAction } from "#/app/cloud-action.ts";
import type { CloudFile } from "#extensions/files/src/types/cloud-file.ts";
import { raiseServerException } from "#/app/server-exception.ts";

const getFileAction = new CloudAPIAction("getFile", {
  params: [{
    key: "fileId",
    label: "File ID",
    type: "DataField",
    required: true,
  }, {
    key: "download",
    label: "Download",
    type: "BooleanField",
  }],
  async run({ app, params, inResponse }) {
    const { fileId } = params;
    const file = await app.orm.getEntry<CloudFile>("cloudFile", fileId);
    try {
      const fileHandle = await Deno.open(file.filePath, { read: true });

      inResponse.setFile({
        content: fileHandle.readable,
        fileName: file.fileName,
        download: params.download,
      });
      return inResponse.respond();
    } catch (e) {
      if (e instanceof Deno.errors.NotFound) {
        raiseServerException(404, `File not found: ${file.fileName}`);
      }
    }
  },
});

export default getFileAction;
