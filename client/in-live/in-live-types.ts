import type { Entry, IDValue } from "../client-types.ts";

/**
 * The status of the websocket connection.
 */
export type SocketStatus =
  | "open"
  | "closed"
  | "connecting"
  | "error"
  | "reconnected";

export type EntryEventUpdate<E extends Entry> = E;

export interface EntryEventDelete<E> {
  [key: string]: unknown;
}

export interface EntryEventJoin<E = Entry> {
  [key: string]: unknown;
}

export interface EntryEventLeave<E> {
  [key: string]: unknown;
}

export type EntryEventMap<E extends Entry> = {
  update: EntryEventUpdate<E>;
  delete: EntryEventDelete<E>;
  join: EntryEventJoin<E>;
  leave: EntryEventLeave<E>;
};
export type EntryEvent<E extends Entry = Entry> = keyof EntryEventMap<E>;

export type EntryListener<
  T extends Entry = Entry,
  E extends EntryEvent<T> = EntryEvent<T>,
> = {
  name: ListenerName;
  callback(event: E, data: EntryEventMap<T>[E]): Promise<void> | void;
};

export interface EntryTypeEventCreate<E> {
  [key: string]: unknown;
}

export interface EntryTypeEventUpdate<E> {
  [key: string]: unknown;
}

export interface EntryTypeEventDelete {
  deleted: boolean;
  entryType: string;
  id: IDValue;
}

export type EntryTypeEventMap<E> = {
  create: EntryTypeEventCreate<E>;
  update: EntryTypeEventUpdate<E>;
  delete: EntryTypeEventDelete;
};
export type EntryTypeEvent<E = unknown> = keyof EntryTypeEventMap<E>;

export type EntryTypeListener<
  T = unknown,
  E extends EntryTypeEvent<T> = EntryTypeEvent,
> = {
  name: ListenerName;
  callback(event: E, data: EntryTypeEventMap<T>[E]): Promise<void> | void;
};
type EntryTypeName = string;
type EntryId = string;
type ListenerName = string;
export type EntyCallbackMap = Map<EntryTypeName, {
  listeners: Map<ListenerName, EntryTypeListener>;
  entries: Map<EntryId, Map<ListenerName, EntryListener>>;
}>;
