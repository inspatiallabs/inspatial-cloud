import type { PathHandler } from "../app/path-handler.ts";

export const staticFilesHandler: PathHandler = {
  name: "staticFiles",
  description: "Static files handler",
  // Match all paths that do not start with /api or /ws
  match: /^(?!\/api|\/ws).*/,
  async handler(inCloud, inRequest, inResponse) {
    return await inCloud.static.serveFile(inRequest, inResponse);
  },
};
