import type { CloudExtension } from "~/extension/cloud-extension.ts";
import type { EntryMap, EntryName } from "@inspatial/cloud/models";
import type { GenericEntry } from "../orm/entry/entry-base.ts";

export type AppMode = "development" | "production";

export interface CloudConfig {
  projectRoot?: string;
  dbClientQuery?: (query: string) => Promise<any>;
  extensions?: Array<CloudExtension>;
}

export type MaybeEntry<T> = T extends EntryName ? EntryMap[T] : GenericEntry;

export type EntryFieldKeys<T extends EntryName | string> = T extends EntryName
  ? Exclude<keyof EntryMap[T]["__fields__"], symbol | number>
  : string;
