import type { ErrorInfo } from "#client/cloud-api/api-client-types.ts";
import { EntryGroup } from "#client/cloud-api/groups/entry-group.ts";
import { SettingsGroup } from "#client/cloud-api/groups/settings-group.ts";
import { AuthGroup } from "#client/cloud-api/groups/auth-group.ts";
import { ORMGroup } from "#client/cloud-api/groups/orm-group.ts";
import type { ActionsAPIDocs } from "@inspatial/serve/actions-api";
interface NotificationInfo {
  title: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
}
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

  async getApiInfo(): Promise<ActionsAPIDocs> {
    return await this.call("api", "getDocs");
  }
  async ping(): Promise<boolean> {
    const url = `${this.host}?group=api&action=ping`;
    let hasServer = false;
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: this.headers,
    }).catch((e) => {
      hasServer = false;
    });
    if (response && response.ok) {
      hasServer = true;
    }
    return hasServer;
  }
  async call<T = any>(
    group: string,
    action: string,
    data?: Record<string, any>,
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
        group === "auth" && action === "authCheck" && info.statusCode === 401
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
    return await response.json();
  }

  #parseError(response: Response, errorContent: string) {
    const info = {} as ErrorInfo;
    info.statusCode = response.status;
    let content: any;
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

const api = new InCloudClient();
