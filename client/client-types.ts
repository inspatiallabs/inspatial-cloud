import type { ExtractFieldKeys } from "../cloud/src/orm/entry/types.ts";
import type {
  EntryBase,
  GenericEntry,
} from "../cloud/src/orm/entry/entry-base.ts";
export type Entry<T extends EntryBase = GenericEntry> = Omit<
  T,
  ExtractFieldKeys<T>
>;

export type {
  CloudAPIActionDocs,
  CloudAPIDocs,
  CloudAPIGroupDocs,
  DocsActionParam,
} from "../cloud/src/api/api-types.ts";

export type { SessionData } from "../cloud/extensions/auth/types.ts";
export type { EntryTypeInfo, IDValue } from "../cloud/src/orm/entry/types.ts";
export type { GetListResponse } from "../cloud/src/orm/orm-types.ts";

export type {
  AdvancedFilter,
  DBFilter,
  ListOptions,
} from "../cloud/src/orm/db/db-types.ts";

export type { SettingsTypeInfo } from "../cloud/src/orm/settings/types.ts";

export type Settings = Record<string, unknown>;
export interface SettingsWithTimestamp<S extends Settings = Settings> {
  data: S;
  updatedAt: {
    [K in keyof S]: number;
  };
}
