import { CloudAPIDocs } from "../client-types.ts";
import { ErrorInfo, NotificationInfo } from "./api-client-types.ts";
import { AuthGroup } from "./groups/auth-group.ts";
import { EntryGroup } from "./groups/entry-group.ts";
import { ORMGroup } from "./groups/orm-group.ts";
import { SettingsGroup } from "./groups/settings-group.ts";

export class InCloudClient {
  host: string;
  headers: Headers;
  /**
   * Entry group of the API.
   */
  entry: EntryGroup;
  settings: SettingsGroup;
  auth: AuthGroup;
  orm: ORMGroup;

  #notify: (
    info: NotificationInfo,
  ) => Promise<void> | void = (info) => {
    const { title, message } = info;
    switch (info.type) {
      case "error":
        console.error(`${title}: ${message}`);
        break;
      case "success":
        console.log(`${title}: ${message}`);
        break;
      case "warning":
        console.warn(`${title}: ${message}`);
        break;
      case "info":
        console.info(`${title}: ${message}`);
        break;
    }
  };

  constructor(
    host?: string,
    onNotify?: (info: NotificationInfo) => Promise<void> | void,
  ) {
    this.host = host || "/api";

    this.headers = new Headers();
    this.headers.append("Content-Type", "application/json");
    this.entry = new EntryGroup(this.call.bind(this));
    this.settings = new SettingsGroup(this.call.bind(this));
    this.auth = new AuthGroup(this.call.bind(this));
    this.orm = new ORMGroup(this.call.bind(this));
    if (onNotify) {
      this.#notify = onNotify;
    }
  }

  async getApiInfo(): Promise<CloudAPIDocs | null> {
    const result = await this.call<CloudAPIDocs>("api", "getDocs");
    if (typeof result === "object" && "groups" in result) {
      return result;
    }
    return null;
  }

  async ping(): Promise<boolean> {
    const url = `${this.host}?group=api&action=ping`;
    let hasServer = false;
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: this.headers,
    }).catch((_e) => {
      hasServer = false;
    });
    if (response && response.ok) {
      hasServer = true;
    }
    return hasServer;
  }

  async call<T = unknown>(
    group: string,
    action: string,
    data?: Record<string, unknown>,
    method: RequestInit["method"] = "POST",
  ): Promise<T> {
    const url = `${this.host}?group=${group as string}&action=${action}`;
    const response = await fetch(url, {
      method,
      credentials: "include",
      headers: this.headers,
      body: JSON.stringify(data),
    }).catch((e) => {
      this.#notify({
        message: e.message,
        title: "Network Error",
        type: "error",
      });
      return new Response(null, { status: 500 });
    });
    if (!response.ok) {
      if (response.status === 302) {
        globalThis.location.href = response.headers.get("Location") || "/";
      }

      const content = await response.text();
      const info = this.#parseError(response, content);
      const title = `${info.title || "API Error"} - ${info.statusCode}`;
      if (
        group === "auth" && action === "authCheck" &&
        [403, 401].includes(info.statusCode)
      ) {
        return {} as T;
      }
      this.#notify({
        message: info.message,
        title: title,
        type: "error",
      });
      return {} as T;
    }

    const text = await response.text();
    if (!text) {
      return {} as T;
    }
    try {
      return JSON.parse(text);
    } catch (_e) {
      return {
        message: text,
      } as T;
    }
  }
  uploadFile(options: {
    fileName: string;
    file: File;
    progressCallback?: (progress: ProgressEvent, uid?: string) => void;
    completeCallback?: (response: unknown, uid?: string) => void;
    errorCallback?: (response: unknown, uid?: string) => void;
    abortCallback?: (response: unknown, uid?: string) => void;
  }): void {
    const data = new FormData();

    data.append("content", options.file);

    data.append("fileName", options.fileName);

    const request = new XMLHttpRequest();
    request.withCredentials = true;
    request.open(
      "POST",
      `${this.host}?group=files&action=upload`,
    );

    // upload progress event
    if (typeof options.progressCallback == "function") {
      const progressCallback = options.progressCallback;
      request.upload.addEventListener("progress", function (e) {
        progressCallback(e);
      });
    }

    // request finished event
    request.addEventListener("load", function () {
      if (request.status >= 200 && request.status < 300) {
        if (typeof options.completeCallback == "function") {
          options.completeCallback(JSON.parse(request.responseText).file);
        }
      } else {
        if (typeof options.errorCallback == "function") {
          options.errorCallback(request);
        }
      }
    });

    request.send(data);
  }
  #parseError(response: Response, errorContent: string) {
    const info = {} as ErrorInfo;
    info.statusCode = response.status;
    let content;
    try {
      content = JSON.parse(errorContent ?? "");
      if ("error" in content) {
        content = content.error;
      }
      info.message = content;
    } catch (_e) {
      content = errorContent;
    }
    info.message = content;
    return info;
  }
}
