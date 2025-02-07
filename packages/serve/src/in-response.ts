import type { HandlerResponse } from "#/extension/path-handler.ts";
import { serveLogger } from "#/logger/serve-logger.ts";

/**
 * A class which simplifies creating responses to client requests.
 */
export class InResponse {
  _content?: string | Uint8Array;
  cookies: Record<string, string> = {};

  _headers: Headers = new Headers();

  #errorStatus?: number;
  #errorStatusText?: string;

  set errorStatus(status: number) {
    if (this.#errorStatus) {
      serveLogger.warn(`Error status already set to ${this.#errorStatus}`);
      return;
    }
    this.#errorStatus = status;
  }
  get errorStatus(): number | undefined {
    return this.#errorStatus;
  }
  set errorStatusText(statusText: string) {
    if (this.#errorStatusText) {
      serveLogger.warn(
        `Error status text already set to ${this.#errorStatusText}`,
      );
      return;
    }
    this.#errorStatusText = statusText;
  }
  get errorStatusText(): string | undefined {
    return this.#errorStatusText;
  }

  constructor() {
    this._headers = new Headers();
    // this._headers.set("Access-Control-Allow-Origin", "*");
    this._headers.set("Access-Control-Allow-Credentials", "true");
    this._headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    );
    this._headers.set("Access-Control-Allow-Headers", "Content-Type");
  }
  setAllowOrigin(origin: string) {
    this._headers.set("Access-Control-Allow-Origin", origin);
  }
  setCookie(key: string, value: string) {
    this.cookies[key] = value;
  }

  setCookies(cookies: Record<string, string>) {
    this.cookies = cookies;
  }

  clearCookie(key: string) {
    this.cookies[key] = "";
  }

  setContent(content: HandlerResponse | any[]): void {
    switch (typeof content) {
      case "object":
        this._content = JSON.stringify(content);
        this.setContentType("json");
        break;
      case "string":
        this.setContentType("text");
        this._content = content;
        break;
      case "number":
        this.setContentType("text");
        this._content = content.toString();
        break;
      default:
        this.setContentType("text");
    }
  }

  setContentType(type: "json" | "html" | "text" | "xml" | "file"): void {
    switch (type) {
      case "json":
        this._headers.set("Content-Type", "application/json");
        break;
      case "html":
        this._headers.set("Content-Type", "text/html");
        break;
      case "text":
        this._headers.set("Content-Type", "text/plain");
        break;
      case "xml":
        this._headers.set("Content-Type", "application/xml");
        break;
      case "file":
        this._headers.set("Content-Type", "application/octet-stream");
        break;
      default:
        this._headers.set("Content-Type", "text/plain");
    }
  }
  setResponseCookie(): void {
    const cookiePairs = Object.entries(this.cookies);
    const cookieStrings = cookiePairs.map(([key, value]) => {
      let cookie = `${key}=${value}`;
      if (value === "") {
        cookie += "; Max-Age=0";
      }
      return cookie;
    });
    this._headers.set("Set-Cookie", cookieStrings.join("; "));
  }

  setErrorStatus(status: number, statusText?: string) {
    this.#errorStatus = status;
    this.#errorStatusText = statusText;
  }
  error(_message?: string | any[]): Response {
    const code = this.#errorStatus || 500;
    const reason = this.#errorStatusText || "Error";

    // this.setContent({ error: message, code: code, reason: reason });
    this.setResponseCookie();
    return new Response(
      this._content,
      {
        headers: this._headers,
        status: code,
        statusText: reason || "Error",
      },
    );
  }

  redirect(url: string): Response {
    return Response.redirect(url, 302);
  }

  respond(): Response {
    this.setResponseCookie();
    return new Response(
      this._content,
      {
        headers: this._headers,
        status: this.errorStatus || 200,
        statusText: this.#errorStatusText || "OK",
      },
    );
  }
}

export function assertResponse(response: any): response is Response {
  return response instanceof Response;
}

export function assertInResponse(response: any): response is InResponse {
  return response instanceof InResponse;
}
