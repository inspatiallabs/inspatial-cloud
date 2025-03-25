import { ServerCall } from "#client/cloud-api/api-client-types.ts";
import { EntryType } from "#client/types.ts";

export class ORMGroup {
  #call: ServerCall;
  constructor(call: ServerCall) {
    this.#call = call;
  }
  /**
   * Get all `EntryType` definitions.
   */
  async entryTypes(): Promise<Array<EntryType>> {
    return await this.#call<Array<EntryType>>("orm", "entryTypes");
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
