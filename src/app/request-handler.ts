import { InRequest } from "#/app/in-request.ts";
import type { InCloud } from "#/inspatial-cloud.ts";
import type { PathHandler } from "#/app/path-handler.ts";
import { InResponse } from "#/app/in-response.ts";
import type { ExtensionManager } from "#/extension-manager/extension-manager.ts";
import { handleException } from "#/app/exeption/handle-exception.ts";

export async function requestHandler(
  request: Request,
  app: InCloud,
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
        app,
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

    let pathHandler: PathHandler | undefined = extensionManager
      .pathHandlers.get(
        currentPath,
      );
    if (!pathHandler) {
      const pathHandlers = Array.from(
        extensionManager.pathHandlers.keys(),
      );
      for (const path of pathHandlers) {
        if (currentPath.startsWith(path)) {
          pathHandler = extensionManager.pathHandlers.get(path);
          break;
        }
      }
    }

    if (pathHandler) {
      const response = await pathHandler.handler(
        app,
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
