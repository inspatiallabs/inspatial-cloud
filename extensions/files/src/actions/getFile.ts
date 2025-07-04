import { CloudAPIAction } from "~/api/cloud-action.ts";

import { raiseServerException } from "~/app/server-exception.ts";
import type { CloudFile } from "../entry-types/cloud-file.type.ts";

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
  async run({ orm, params, inResponse }) {
    const { fileId } = params;
    const file = await orm.getEntry<CloudFile>("cloudFile", fileId);
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
