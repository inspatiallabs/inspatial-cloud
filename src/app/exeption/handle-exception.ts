import { InResponse } from "~/app/in-response.ts";
import type { ExceptionHandler } from "#types/serve-types.ts";
import { isServerException } from "~/app/server-exception.ts";
import { inLog } from "~/in-log/in-log.ts";

export async function handleException(
  err: unknown,
  inResponse: InResponse,
  exceptionHandlers: Map<string, ExceptionHandler>,
): Promise<Response> {
  inResponse = inResponse || new InResponse();
  const clientMessages: Array<Record<string, any> | string> = [];
  let handled = false;
  for (const handler of exceptionHandlers.values()) {
    const response = await handler.handler(err);
    if (!response || Object.keys(response).length === 0) {
      continue;
    }
    handled = true;
    if (response.clientMessage !== undefined) {
      clientMessages.push(response.clientMessage);
    }
    const { serverMessage } = response;
    if (serverMessage) {
      const { content, subject, type } = serverMessage;
      switch (type) {
        case "error":
          inLog.error(content, {
            subject,
            stackTrace: (err as Error).stack,
          });
          break;
        case "warning":
          inLog.warn(content, {
            subject,
          });
          break;
        case "info":
          inLog.info(content, {
            subject,
          });
          break;
        default:
          inLog.error(content, {
            subject,
          });
      }
    }
    if (response.status) {
      inResponse.errorStatus = response.status;
    }
    if (response.statusText) {
      inResponse.errorStatusText = response.statusText;
    }
  }
  if (!handled && isServerException(err)) {
    clientMessages.push(err.message);
    inResponse.errorStatus = err.status;
    inResponse.errorStatusText = err.name;
    let type: "error" | "warn" = "error";
    if (err.status >= 400 && err.status < 500) {
      type = "warn";
    }
    inLog[type](err.message, {
      subject: err.name,
      stackTrace: err.stack,
    });

    handled = true;
  }
  if (!handled && err instanceof Error) {
    inLog.error(`${err.message}: ${err.message}`, {
      subject: "Unknown Error",
      stackTrace: err.stack,
    });
    clientMessages.push("An unknown error occurred");
    inResponse.errorStatus = 500;
    inResponse.errorStatusText = "Internal Server Error";
    handled = true;
  }
  if (!handled) {
    inLog.error("An unknown error occurred", {
      subject: "Unknown Error",
      stackTrace: new Error().stack,
    });
    inResponse.errorStatus = 500;
    inResponse.errorStatusText = "Internal Server Error";
    clientMessages.push("An unknown error occurred");
    handled = true;
  }

  if (!inResponse.errorStatus) {
    inResponse.errorStatus = 500;
  }
  if (!inResponse.errorStatusText) {
    inResponse.errorStatusText = "Internal Server Error";
  }
  inResponse.setContent(clientMessages);
  return inResponse.error();
}
