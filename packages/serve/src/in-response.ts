import type { HandlerResponse } from "#/extension/path-handler.ts";
import { serveLogger } from "#/logger/serve-logger.ts";

/**
 * A class which simplifies creating responses to client requests.
 */
export class InResponse {
  /**
   * The content of the response.
   */
  #content?: string | Uint8Array;
  /**
   * A map of cookies to set in the response.
   */
  #cookies: Map<string, string> = new Map();

  /**
   * The headers for the response.
   */
  #headers: Headers = new Headers();

  /**
   * The error status code for the response.
   */
  #errorStatus?: number;
  /**
   * The error status text for the response.
   */
  #errorStatusText?: string;

  /**
   * Sets the error status code for the response.
   * If this is already set, a warning will be logged and the status will not be updated.
   * @param status - The status code to set for the response
   */
  set errorStatus(status: number) {
    if (this.#errorStatus) {
      serveLogger.warn(`Error status already set to ${this.#errorStatus}`);
      return;
    }
    this.#errorStatus = status;
  }
  /**
   * Gets the error status code for the response.
   */
  get errorStatus(): number | undefined {
    return this.#errorStatus;
  }
  /**
   * Sets the error status text for the response.
   * If this is already set, a warning will be logged and the status text will not be updated.
   * @param statusText - The status text to set for the response
   */
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
    this.#headers = new Headers();
    // this._headers.set("Access-Control-Allow-Origin", "*");
    this.#headers.set("Access-Control-Allow-Credentials", "true");
    this.#headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    );
    this.#headers.set("Access-Control-Allow-Headers", "Content-Type");
  }
  /**
   * Sets the `Access-Control-Allow-Origin` header to the provided origin.
   * @param origin - The origin to allow
   */
  setAllowOrigin(origin: string) {
    this.#headers.set("Access-Control-Allow-Origin", origin);
  }
  /**
   * Sets a cookie with the provided key and value.
   * @param key - The key of the cookie to set
   * @param value - The value of the cookie to set
   */
  setCookie(key: string, value: string) {
    this.#cookies.set(key, value);
  }
  /**
   * Sets multiple cookies from the provided object.
   * @param cookies - A record of key-value pairs to set as cookies
   */
  setCookies(cookies: Record<string, string>) {
    for (const [key, value] of Object.entries(cookies)) {
      this.#cookies.set(key, value);
    }
  }

  /**
   * Clears the cookie with the provided key.
   * @param key - The key of the cookie to clear
   */
  clearCookie(key: string) {
    this.#cookies.set(key, "");
  }

  /**
   * Sets the content of the response.
   * The content can be a string, number, object, array, or an instance of {@link InResponse} or {@link Response}
   * @param content - The content to set for the response
   */
  setContent(content: HandlerResponse | any[]): void {
    switch (typeof content) {
      case "object":
        this.#content = JSON.stringify(content);
        this.setContentType("json");
        break;
      case "string":
        this.setContentType("text");
        this.#content = content;
        break;
      case "number":
        this.setContentType("text");
        this.#content = content.toString();
        break;
      default:
        this.setContentType("text");
    }
  }

  /**
   * Sets the appropriate `Content-Type` header based on the `type` provided.
   * @param {"json" | "html" | "text" | "xml" | "file"} type - The content type to set for the response
   */
  setContentType(type: "json" | "html" | "text" | "xml" | "file"): void {
    switch (type) {
      case "json":
        this.#headers.set("Content-Type", "application/json");
        break;
      case "html":
        this.#headers.set("Content-Type", "text/html");
        break;
      case "text":
        this.#headers.set("Content-Type", "text/plain");
        break;
      case "xml":
        this.#headers.set("Content-Type", "application/xml");
        break;
      case "file":
        this.#headers.set("Content-Type", "application/octet-stream");
        break;
      default:
        this.#headers.set("Content-Type", "text/plain");
    }
  }

  /**
   * This method is used to set the response cookie in the headers from the `cookies` object.
   * It is called by the `respond` and `error` methods.
   */
  #setResponseCookie(): void {
    const cookieStrings = [];
    for (const [key, value] of this.#cookies) {
      let cookie = `${key}=${value}`;
      if (value === "") {
        cookie += "; Max-Age=0";
      }
      cookieStrings.push(cookie);
    }
    this.#headers.set("Set-Cookie", cookieStrings.join("; "));
  }

  /**
   * This method is used to set the status code and status text for the response.
   *
   * @param {number} statusCode - The status code to set for the response
   * @param {string} statusText - The status text to set for the response
   */
  setErrorStatus(statusCode: number, statusText?: string) {
    this.#errorStatus = statusCode;
    this.#errorStatusText = statusText;
  }

  /**
   * This method is used to send an error response to the client.
   * It sets the status code and status text to the values set with
   * `inResponse.setErrorStatus(statusCode,statusText)`.
   * @returns {Response} The response object
   */
  error(): Response {
    const code = this.#errorStatus || 500;
    const reason = this.#errorStatusText || "Error";

    // this.setContent({ error: message, code: code, reason: reason });
    this.#setResponseCookie();
    return new Response(
      this.#content,
      {
        headers: this.#headers,
        status: code,
        statusText: reason || "Error",
      },
    );
  }

  /**
   * This method is used to send a redirect response to the client.
   *
   * @param {string} url The URL to redirect the client to
   * @returns {Response} The response object
   */
  redirect(url: string): Response {
    this.#setResponseCookie();
    this.#headers.set("Location", url);
    return new Response(null, {
      headers: this.#headers,
      status: 302,
      statusText: "Redirect",
    });
  }

  /**
   * This method is used to send the response to the client.
   * It handles settings the response cookie, status, statusText,
   * headers, and content.
   *
   * @returns {Response} The response object
   */
  respond(): Response {
    this.#setResponseCookie();
    return new Response(
      this.#content,
      {
        headers: this.#headers,
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
