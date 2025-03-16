import { ListOptions } from "#orm/types";
import { ErrorInfo } from "#client/cloud-api/api-client-types.ts";
import { EntryGroup } from "#client/cloud-api/groups/entry-group.ts";
import { SettingsGroup } from "#client/cloud-api/groups/settings-group.ts";

export class InCloudClient {
  host: string;
  headers: Headers;
  /**
   * Entry group of the API.
   */
  entry: EntryGroup;
  settings: SettingsGroup;
  constructor(host?: string) {
    this.host = host || "/api";
    this.headers = new Headers();
    this.headers.append("Content-Type", "application/json");
    this.entry = new EntryGroup(this.call.bind(this));
    this.settings = new SettingsGroup(this.call.bind(this));
  }

  async getApiInfo() {
    return await this.call("api", "getDocs");
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

  #notify(
    info: { message: string; title: string; type: string },
  ) {
    console.error(info);
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
