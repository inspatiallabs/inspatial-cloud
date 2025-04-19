import { serveLogger } from "#/logger/serve-logger.ts";
import type { HandlerResponse } from "#/app/path-handler.ts";
import { inferMimeType } from "#/static/src/mimeTypes.ts";

interface CookieOptions {
  maxAge?: number;
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}
class Cookie {
  key: string;
  value: string;
  options: CookieOptions;
  constructor(key: string, value: string | number, options?: CookieOptions) {
    this.key = key;
    this.value = String(value);
    this.options = options || {};
  }

  toString(): string {
    let cookieString = `${this.key}=${this.value}`;
    if (this.options.maxAge) {
      cookieString += `; Max-Age=${this.options.maxAge}`;
    }
    if (this.options.path) {
      cookieString += `; Path=${this.options.path}`;
    }
    if (this.options.domain) {
      cookieString += `; Domain=${this.options.domain}`;
    }
    if (this.options.secure) {
      cookieString += "; Secure";
    }
    if (this.options.httpOnly) {
      cookieString += "; HttpOnly";
    }
    if (this.options.sameSite) {
      cookieString += `; SameSite=${this.options.sameSite}`;
    }
    return cookieString;
  }
}
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
  #cookies: Map<string, Cookie | null> = new Map();

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

  cookieDefaults: CookieOptions = {
    sameSite: "None",
    secure: true,
    httpOnly: true,
  };

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
  setAllowOrigin(origin: string): void {
    this.#headers.set("Access-Control-Allow-Origin", origin);
  }
  /**
   * Sets a cookie with the provided key and value.
   * @param key - The key of the cookie to set
   * @param value - The value of the cookie to set
   */
  setCookie(key: string, value: string, options?: CookieOptions): void {
    this.#cookies.set(
      key,
      new Cookie(key, value, {
        ...this.cookieDefaults,
        ...options,
      }),
    );
  }
  /**
   * Sets multiple cookies from the provided object.
   * @param cookies - A record of key-value pairs to set as cookies
   */
  setCookies(
    cookies: Record<string, { value: string; options?: CookieOptions }>,
  ): void {
    for (const [key, value] of Object.entries(cookies)) {
      this.#cookies.set(
        key,
        new Cookie(key, value.value, {
          ...this.cookieDefaults,
          ...value.options,
        }),
      );
    }
  }

  /**
   * Clears the cookie with the provided key.
   * @param key - The key of the cookie to clear
   */
  clearCookie(key: string): void {
    this.#cookies.set(key, null);
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
  setContentType(
    type: "json" | "html" | "text" | "xml" | "file" | "jpg" | "png",
  ): void {
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

  setFile(options: {
    content: string | Uint8Array;
    fileName: string;
  }): void {
    this.#headers.set(
      "Content-Disposition",
      `attachment; filename="${options.fileName}"`,
    );
    const mimType = inferMimeType(options.fileName);
    if (mimType) {
      this.#headers.set("Content-Type", mimType);
      this.#content = options.content;
      return;
    }
    this.#headers.set("Content-Type", "application/octet-stream");
    if (options.content instanceof Uint8Array) {
      this.#content = options.content;
      return;
    }
    this.#content = new TextEncoder().encode(options.content);
  }

  /**
   * This method is used to set the response cookie in the headers from the `cookies` object.
   * It is called by the `respond` and `error` methods.
   */
  #setResponseCookie(): void {
    const cookieStrings = [];
    if (this.#cookies.size === 0) {
      return;
    }
    for (const [key, value] of this.#cookies) {
      if (value === null) {
        const cookie = new Cookie(key, "", {
          maxAge: 0,
        });
        cookieStrings.push(cookie.toString());
        continue;
      }
      cookieStrings.push(value.toString());
    }
    const fullCookie = cookieStrings.join("; ");
    serveLogger.debug(fullCookie);
    this.#headers.set("Set-Cookie", fullCookie);
  }

  /**
   * This method is used to set the status code and status text for the response.
   *
   * @param {number} statusCode - The status code to set for the response
   * @param {string} statusText - The status text to set for the response
   */
  setErrorStatus(statusCode: number, statusText?: string): void {
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

export function assertResponse(response: unknown): response is Response {
  return response instanceof Response;
}

export function assertInResponse(response: unknown): response is InResponse {
  return response instanceof InResponse;
}
