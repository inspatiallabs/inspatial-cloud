import type { PathHandler } from "~/serve/path-handler.ts";

export const staticFilesHandler: PathHandler = {
  name: "staticFiles",
  description: "Static files handler",
  // Match all paths that do not equal /api or /ws
  match: /^\/(?!api$|ws$).*/,
  async handler(inCloud, inRequest, inResponse) {
    return await inCloud.static.serveFile(inRequest, inResponse);
  },
};
