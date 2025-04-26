import { Middleware } from "#/app/middleware.ts";
import { raiseServerException } from "#/app/server-exception.ts";
import { InRequest } from "#/app/in-request.ts";
import { InResponse } from "#/app/in-response.ts";
import { inLog } from "#/in-log/in-log.ts";
import InCloud from "@inspatial/cloud";

const filesMiddleware: Middleware = {
  name: "files",
  description: "File Handler",
  async handler(app, inRequest, inResponse) {
    if (inRequest.method !== "POST") return;
    if (inRequest.group !== "files") return;
    switch (inRequest.action) {
      case "upload":
        return handleBody(app, inRequest, inResponse);
      case "getFile":
      default:
        raiseServerException(400, "Invalid action");
    }
  },
};

async function handleBody(
  app: InCloud,
  inRequest: InRequest,
  inResponse: InResponse,
) {
  app;
  const formData = await inRequest.request.formData();
  const file = formData.get("content") as File;
  const fileName = formData.get("fileName") as string;
  const stream = file.stream();
  const path = `${app.filesPath}/${fileName}`;
  Deno.writeFile(path, stream, {
    create: true,
  });
  inResponse.setContent({
    file: {
      name: fileName,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
    },
  });
  return inResponse.respond();
}

export default filesMiddleware;
