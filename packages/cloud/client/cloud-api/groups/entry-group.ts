import { ServerCall } from "#client/cloud-api/api-client-types.ts";
import { ListOptions } from "#orm/types";

export class EntryGroup {
  #call: ServerCall;
  constructor(
    call: ServerCall,
  ) {
    this.#call = call;
  }
  async getEntry<T>(entryType: string, id: string): Promise<T> {
    return await this.#call<T>("entry", "getEntry", { entryType, id });
  }
  /**
   * Get a list of entries of a given type.
   */
  async getEntryList<T>(
    entryType: string,
    options?: ListOptions,
  ): Promise<T[]> {
    return await this.#call<T[]>("entry", "getEntryList", {
      entryType,
      options,
    });
  }
  async getNewEntry<T>(entryType: string): Promise<T> {
    return await this.#call<T>("entry", "getNewEntry", { entryType });
  }
  async createEntry<T>(entryType: string, entry: T): Promise<string> {
    return await this.#call<string>("entry", "createEntry", {
      entryType,
      entry,
    });
  }

  async updateEntry<T>(entryType: string, id: string, entry: T): Promise<void> {
    return await this.#call<void>("entry", "updateEntry", {
      entryType,
      id,
      entry,
    });
  }

  async deleteEntry(entryType: string, id: string): Promise<void> {
    return await this.#call<void>("entry", "deleteEntry", { entryType, id });
  }

  async runEntryAction<T, R>(
    entryType: string,
    id: string,
    action: string,
    params: T,
  ): Promise<R> {
    return await this.#call<R>("entry", "runEntryAction", {
      entryType,
      id,
      action,
      params,
    });
  }
}
