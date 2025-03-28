import type {ListOptions, ServerCall} from "#client/cloud-api/api-client-types.ts";
import type {Entry} from "#client/types.ts";
import type {IDValue} from "#client/types.ts";
import type {ListResponse} from "#client/types.ts";

export class EntryGroup {
    #call: ServerCall;

    constructor(
        call: ServerCall,
    ) {
        this.#call = call;
    }

    async getEntry<T>(entryType: string, id: string): Promise<T> {
        return await this.#call<T>("entry", "getEntry", {entryType, id});
    }

    /**
     * Get a list of entries of a given type.
     */
    async getEntryList<T>(
        entryType: string,
        options?: ListOptions,
    ): Promise<ListResponse<T>> {
        return await this.#call("entry", "getEntryList", {
            entryType,
            options,
        });
    }

    async getNewEntry<T extends Entry = Entry>(entryType: string): Promise<T> {
        return await this.#call<T>("entry", "getNewEntry", {entryType});
    }

    async createEntry<T extends Entry = Entry>(entryType: string, entry: T): Promise<T> {
        return await this.#call<T>("entry", "createEntry", {
            entryType,
            data: entry,
        });
    }

    async updateEntry<T>(entryType: string, id: IDValue, entry: T): Promise<T> {
        return await this.#call<T>("entry", "updateEntry", {
            entryType,
            id,
            data: entry,
        });
    }

    async deleteEntry(entryType: string, id: IDValue): Promise<void> {
        return await this.#call<void>("entry", "deleteEntry", {entryType, id});
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
