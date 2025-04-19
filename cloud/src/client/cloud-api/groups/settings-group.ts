import type { ServerCall } from "#client/cloud-api/api-client-types.ts";

export class SettingsGroup {
  #call: ServerCall;
  constructor(call: ServerCall) {
    this.#call = call;
  }
  async getSettings(settingsType: string): Promise<any> {
    return await this.#call<any>("settings", "getSettings", { settingsType });
  }

  async updateSettings(settingsType: string, settings: any): Promise<void> {
    return await this.#call<void>("settings", "updateSettings", {
      settingsType,
      settings,
    });
  }

  async runSettingsAction<T, R>(
    settingsType: string,
    action: string,
    params: T,
  ): Promise<R> {
    return await this.#call<R>("settings", "runSettingsAction", {
      settingsType,
      action,
      params,
    });
  }
}
