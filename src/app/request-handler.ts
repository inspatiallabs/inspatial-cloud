import { InRequest } from "~/app/in-request.ts";
import type { PathHandler } from "~/app/path-handler.ts";
import { InResponse } from "~/app/in-response.ts";
import type { ExtensionManager } from "~/extension-manager/extension-manager.ts";
import { handleException } from "~/app/exeption/handle-exception.ts";
import type { InCloud } from "../cloud/in-cloud.ts";
import { raiseServerException } from "./server-exception.ts";

export async function requestHandler(
  request: Request,
  inCloud: InCloud,
  extensionManager: ExtensionManager,
): Promise<Response> {
  const inRequest = new InRequest(
    request,
  );
  for (const { handler } of extensionManager.requestLifecycle.setup) {
    await handler(inRequest);
  }

  const inResponse = new InResponse();
  try {
    for (const middleware of extensionManager.middlewares.values()) {
      const response = await middleware.handler(
        inCloud,
        inRequest,
        inResponse,
      );

      if (response instanceof InResponse) {
        return response.respond();
      }
      if (response instanceof Response) {
        return response;
      }
    }

    if (inRequest.method === "OPTIONS") {
      return inResponse.respond();
    }

    const currentPath = inRequest.path;

    let pathHandler: PathHandler | undefined = undefined;
    for (const handler of extensionManager.pathHandlers) {
      if (handler.match.test(currentPath)) {
        pathHandler = handler;
        break;
      }
    }
    if (!pathHandler) {
      raiseServerException(
        404,
        `Not Found`,
      );
    }
    const response = await pathHandler.handler(
      inCloud,
      inRequest,
      inResponse,
    );
    if (response instanceof InResponse) {
      return response.respond();
    }
    if (response instanceof Response) {
      return response;
    }
    if (response) {
      inResponse.setContent(response);
    }
    return inResponse.respond();
  } catch (e) {
    return await handleException(
      e,
      inResponse,
      extensionManager.exceptionHandlers,
    );
  }
}
