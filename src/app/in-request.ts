import { InContext } from "#/app/in-context.ts";
import type { RequestMethod } from "#types/serve-types.ts";
import { inLog } from "../in-log/in-log.ts";

/**
 * InRequest is a class that wraps the incoming request object and parses it,
 * providing a more convenient way to access the request properties.
 */
export class InRequest<CTX extends Record<string, any> = Record<string, any>> {
  /**
   * A boolean indicating if the request is a websocket upgrade request.
   * This is determined by checking if the `Connection` header is `upgrade` and the `Upgrade` header is `websocket`.
   */
  upgradeSocket: boolean = false;

  /**
   * The hostname of the request URL.
   * This is the domain part of the URL without the protocol or port.
   *
   * @example
   * for `https://example.com:8080/api/v1/users?group=users`, the host is `example.com`
   */
  host: string = "";

  /**
   * The full host of the request URL.
   * This is the domain part of the URL with the port and protocol.
   *
   * @example
   * for `https://example.com:8080/api/v1/users?group=users`, the host is `https://example.com:8080`
   */
  fullHost: string = "";

  /**
   * The protocol of the request URL.
   * This is the protocol part of the URL, usually `http:` or `https:`.
   *
   * @example
   * for `https://example.com:8080/api/v1/users?group=users`, the protocol is `https:`
   */
  protocol: string = "";

  /**
   * The headers received in the request.
   */
  readonly headers: Headers;

  /**
   * The origin of the request extracted from the `Origin` header.
   * This is only set if the `Origin` header is present in the request, usually for CORS requests from the browser.
   */
  origin: string = "";

  /**
   * The original incoming request object that was passed to the constructor.
   */
  request: Request;

  /**
   * The cookies extracted from the request headers.
   */
  cookies: Map<string, string> = new Map();

  #bodyLoaded = false;
  #body: Map<string, unknown> = new Map();
  /**
   * The body of the request. This is a map of key-value pairs.
   * This is loaded in the `loadBody` method.
   */

  get body(): Promise<Record<string, any>> {
    return this.#loadBody().then(() => Object.fromEntries(this.#body));
  }

  /**
   * The HTTP method of the request.
   */
  method: RequestMethod = "GET";

  /**
   * The query parameters of the request other than `group`, `action`, and `authToken`.
   */
  params!: URLSearchParams;

  group?: string;

  action?: string;

  /**
   * The path of the request URL.
   * This is the part of the URL after the domain and port, including the leading slash.
   * It does not include the query parameters.
   *
   * @example
   * `https://example.com:8080/api/v1/users?group=users` => `/api/v1/users`
   */
  path: string = "";

  /**
   * The port of the request URL if it is specified.
   */
  port?: number;

  /**
   * A boolean indicating if the request is for a file.
   * This is determined by checking if the path has a file extension.
   */
  isFile = false;

  /**
   * The file extension of the request if it is a file request.
   */
  fileExtension = "";

  /**
   * The context object for the request.
   */
  readonly context: InContext<CTX>;

  /**
   * Creates a new InRequest instance.
   * @param request - The incoming {@link Request} object to parse
   */
  constructor(request: Request) {
    this.request = request;
    this.context = new InContext();
    this.headers = new Headers(request.headers);
    this.#parseHeaders();
    this.#parseUrl();
    this.#extractCookies();
    this.#checkForSocketUpgrade();
    this.#checkForFileExtension();
  }

  /**
   * Sets the `isFile` and `fileExtension` properties if the path has a file extension.
   * Helps to easily check if the request is for a file.
   */
  #checkForFileExtension() {
    const pathParts = this.path.split("/");
    const lastPart = pathParts[pathParts.length - 1];
    const parts = lastPart.split(".");
    if (parts.length < 2) {
      return;
    }
    const ext = parts[parts.length - 1];
    if (ext) {
      this.isFile = true;
      this.fileExtension = ext;
    }
  }

  /**
   * This is called in the constructor to check if the request is a websocket upgrade request.
   * This sets the `upgradeSocket` property to true if the request is a websocket upgrade request.
   * Can be used later to easily check if the request is a websocket upgrade request.
   */
  #checkForSocketUpgrade() {
    let connection = "";
    let upgrade = "";
    this.request.headers.forEach((value, key) => {
      if (key.toLowerCase() === "connection") {
        connection = value.toLowerCase();
      }
      if (key.toLowerCase() === "upgrade") {
        upgrade = value.toLowerCase();
      }
    });
    this.upgradeSocket = connection === "upgrade" &&
      upgrade === "websocket";
  }

  /**
   * Extracts the cookies from the request headers and sets them to the `cookies` property.
   * This is called in the constructor.
   */
  #extractCookies() {
    const cookie = this.request.headers.get("cookie");

    if (cookie) {
      const cookiePairs = cookie.split(";");
      cookiePairs.forEach((pair) => {
        const [key, value] = pair.trim().split("=");
        this.cookies.set(key, value);
      });
    }
  }

  /**
   * Parses the request headers and sets the relevant properties.
   */

  #parseHeaders() {
    this.origin = this.headers.get("origin") || "";
  }

  /**
   * Parses the request URL and sets the relevant properties.
   * **Note:** The query parameters are set to the `params` property, and are later merged with the body in the `loadBody` method.
   */
  #parseUrl() {
    const url = new URL(this.request.url);
    this.method = this.request.method as RequestMethod;
    this.path = url.pathname;
    this.port = parseInt(url.port);
    this.host = url.hostname;
    this.params = url.searchParams;
    this.protocol = url.protocol;
    this.fullHost = `${url.protocol}//${url.host}`;
    this.group = this.params.get("group") || undefined;
    this.action = this.params.get("action") || undefined;
    this.params.delete("group");
    this.params.delete("action");
  }

  /**
   * Loads the body of the request and sets it to the `body` property.
   * This merges the query parameters with the body, giving preference to the body.
   */
  async #loadBody(): Promise<void> {
    if (this.#bodyLoaded) return;
    this.#body = new Map([...this.params]);
    try {
      const body = await this.request.json();
      if (typeof body === "object") {
        for (const [key, value] of Object.entries(body)) {
          this.#body.set(key, value);
        }
      }
    } catch (e) {
      if (e instanceof SyntaxError) {
        return;
      }
      if (e instanceof Deno.errors.BadResource) {
        return;
      }
      if (Error.isError(e)) {
        inLog.error(e.message, {
          subject: e.name,
          stackTrace: e.stack,
        });
        return;
      }
      console.error(e);
    }
  }
}
