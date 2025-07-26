import type { PathHandler } from "~/serve/path-handler.ts";

export const staticFilesHandler: PathHandler = {
  name: "staticFiles",
  description: "Static files handler",
  // Match all paths since this is the last handler and is a fallback
  // It will handle all requests that do not match any other handler
  match: /.*/,
  async handler(inCloud, inRequest, inResponse) {
    return await inCloud.static.serveFile(inRequest, inResponse);
  },
};
