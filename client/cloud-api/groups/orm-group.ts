import type { ServerCall } from "../api-client-types.ts";
import type { EntryTypeInfo, SettingsTypeInfo } from "../../client-types.ts";

export class ORMGroup {
  readonly #call: ServerCall;

  constructor(call: ServerCall) {
    this.#call = call;
  }

  /**
   * Get all `EntryType` definitions.
   */
  async entryTypes(): Promise<Array<EntryTypeInfo>> {
    return await this.#call<Array<EntryTypeInfo>>("orm", "entryTypes");
  }

  async settingsTypes(): Promise<Array<SettingsTypeInfo>> {
    return await this.#call<Array<SettingsTypeInfo>>("orm", "settingsTypes");
  }

  async planMigration(): Promise<void> {
    return await this.#call<void>("orm", "planMigration");
  }

  async migrate(): Promise<void> {
    return await this.#call<void>("orm", "migrate");
  }

  async generateInterfaces(): Promise<void> {
    return await this.#call<void>("orm", "generateInterfaces");
  }
}
