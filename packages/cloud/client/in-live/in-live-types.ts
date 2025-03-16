/**
 * The status of the websocket connection.
 */
export type SocketStatus = "open" | "closed" | "connecting" | "error";

export interface EntryEventUpdate<E> {}
export interface EntryEventDelete<E> {}
export interface EntryEventJoin<E> {}
export interface EntryEventLeave<E> {}

export type EntryEventMap<E> = {
  update: EntryEventUpdate<E>;
  delete: EntryEventDelete<E>;
  join: EntryEventJoin<E>;
  leave: EntryEventLeave<E>;
};
export type EntryEvent<E> = keyof EntryEventMap<E>;
export type EntryListener<T, E extends EntryEvent<T>> = {
  name: ListenerName;
  callback(event: E, data: EntryEventMap<T>[E]): Promise<void> | void;
};
export interface EntryTypeEventCreate<E> {}
export interface EntryTypeEventUpdate<E> {}
export interface EntryTypeEventDelete<E> {}

export type EntryTypeEventMap<E> = {
  create: EntryTypeEventCreate<E>;
  update: EntryTypeEventUpdate<E>;
  delete: EntryTypeEventDelete<E>;
};
export type EntryTypeEvent<E> = keyof EntryTypeEventMap<E>;

export type EntryTypeListener<T, E extends EntryTypeEvent<T>> = {
  name: ListenerName;
  callback(event: E, data: EntryTypeEventMap<T>[E]): Promise<void> | void;
};
type EntryTypeName = string;
type EntryId = string;
type ListenerName = string;
export type EntyCallbackMap = Map<EntryTypeName, {
  listeners: Map<ListenerName, EntryTypeListener<any, any>>;
  entries: Map<EntryId, Map<ListenerName, EntryListener<any, any>>>;
}>;
