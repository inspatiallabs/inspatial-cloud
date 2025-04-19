import type { ExtractFieldKeys } from "#/orm/entry/types.ts";
import type { EntryBase, GenericEntry } from "#/orm/entry/entry-base.ts";
export type Entry<T extends EntryBase = GenericEntry> = Omit<
  T,
  ExtractFieldKeys<T>
>;

export type {
  CloudAPIActionDocs,
  CloudAPIDocs,
  CloudAPIGroupDocs,
  DocsActionParam,
} from "#/api/api-types.ts";

export type { SessionData } from "#extensions/auth/types.ts";
export type { EntryTypeInfo, IDValue } from "#/orm/entry/types.ts";
export type { GetListResponse } from "#/orm/orm-types.ts";

export type {
  AdvancedFilter,
  DBFilter,
  ListOptions,
} from "#/orm/db/db-types.ts";

export type { SettingsTypeInfo } from "#/orm/settings/types.ts";

export type Settings = Record<string, unknown>;
export interface SettingsWithTimestamp<S extends Settings = Settings> {
  data: S;
  updatedAt: {
    [K in keyof S]: number;
  };
}
