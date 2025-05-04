import type {
  BaseTypeConfig,
  BaseTypeInfo,
} from "#/orm/shared/shared-types.ts";
import type { SettingsBase } from "#/orm/settings/settings-base.ts";
import type { InSpatialORM } from "#/orm/inspatial-orm.ts";
import type { InField, InFieldType } from "#/orm/field/field-def-types.ts";

export interface SettingsTypeInfo extends BaseTypeInfo {
  config: SettingsTypeConfig;
}

export interface SettingsTypeConfig extends BaseTypeConfig {
}

export interface SettingsRow {
  id: string;
  settingsType: string;
  field: string;
  value: {
    value: any;
    type: InFieldType;
  };
  updatedAt: number;
}

export type SettingsHookFunction<S extends SettingsBase> = {
  (
    hookParams:
      & {
        orm: InSpatialORM;
      }
      & {
        [K in S["_name"] | "settings"]: S;
      },
  ): Promise<void> | void;
};
export type SettingsHookDefinition<S extends SettingsBase = SettingsBase> = {
  name: string;
  description?: string;
  handler: SettingsHookFunction<S>;
};

export type SettingsActionDefinition<S extends SettingsBase = SettingsBase> = {
  key: string;
  description?: string;
  action(
    actionParams:
      & {
        orm: InSpatialORM;
      }
      & { [K in S["_name"] | "settings"]: S }
      & {
        data: Record<string, any>;
      },
  ): Promise<any | void> | any | void;
  params: Array<InField>;
};
