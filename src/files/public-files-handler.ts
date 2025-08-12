import type { PathHandler } from "../serve/path-handler.ts";
import { raiseServerException } from "../serve/server-exception.ts";
import { joinPath } from "../utils/path-utils.ts";

export const publicFilesHandler: PathHandler = {
  name: "publicFiles",
  description: "Serve files that were uploaded as public files",
  match: /^\/files\/(.+)$/,
  async handler(inCloud, inRequest, inResponse) {
    const accountAndFileId = inRequest.path.replace(/^\/files\//, "");
    if (!accountAndFileId) {
      raiseServerException(404, "File not found");
    }
    let filePath = inCloud.inCache.getValue("publicFiles", accountAndFileId);
    if (!filePath) {
      const [accountId, fileId] = accountAndFileId.split("/");
      const accontFolder = joinPath(inCloud.publicFilesPath, accountId);
      if (!accountId || !fileId) {
        raiseServerException(404, "File not found");
      }
      for await (const item of Deno.readDir(accontFolder)) {
        if (item.isFile && item.name.startsWith(fileId)) {
          filePath = joinPath(accountId, item.name);
          inCloud.inCache.setValue("publicFiles", accountAndFileId, filePath);
          break;
        }
      }
      if (!filePath) {
        raiseServerException(404, "File not found");
      }
    }
    return await inCloud.publicFiles.serveFromPath(filePath, inResponse);
  },
};
