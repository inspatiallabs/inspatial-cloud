import type { PathHandler } from "../serve/path-handler.ts";
import { raiseServerException } from "../serve/server-exception.ts";

export const publicFilesHandler: PathHandler = {
  name: "publicFiles",
  description: "Serve files that were uploaded as public files",
  match: /^\/files\/(.+)$/,
  async handler(inCloud, inRequest, inResponse) {
    const fileId = inRequest.path.replace(/^\/files\//, "");
    if (!fileId) {
      raiseServerException(404, "File not found");
    }
    let filePath = inCloud.inCache.getValue("publicFiles", fileId);
    if (!filePath) {
      for await (const item of Deno.readDir(inCloud.publicFilesPath)) {
        if (item.isFile && item.name.startsWith(fileId)) {
          filePath = item.name;
          inCloud.inCache.setValue("publicFiles", fileId, filePath);
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
