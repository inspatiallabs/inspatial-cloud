import type {
  BaseConfig,
  BaseTypeConfig,
  BaseTypeInfo,
} from "~/orm/shared/shared-types.ts";
import type {
  GenericSettings,
  SettingsBase,
} from "~/orm/settings/settings-base.ts";
import type { InSpatialORM } from "~/orm/inspatial-orm.ts";
import type { InField, InFieldType } from "~/orm/field/field-def-types.ts";
import type { HookName } from "../orm-types.ts";
import type { InCloud } from "@inspatial/cloud/types";

export interface SettingsTypeInfo extends BaseTypeInfo {
  config: SettingsTypeConfig;
  actions?: Array<SettingsActionDefinition>;
}

export interface SettingsTypeConfig extends BaseTypeConfig {
}
export type SettingsConfig<S extends SettingsBase = GenericSettings> =
  & BaseConfig
  & {
    actions?: Array<SettingsActionDefinition<S>>;
    hooks?: Partial<Record<HookName, Array<SettingsHookDefinition<S>>>>;
  };
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

export type GlobalSettingsHook = () => void;
export type SettingsHookFunction<S extends SettingsBase = SettingsBase> = {
  (
    hookParams:
      & {
        inCloud: InCloud;
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
  private?: boolean;
  action(
    actionParams:
      & {
        orm: InSpatialORM;
        inCloud: InCloud;
      }
      & { [K in S["_name"] | "settings"]: S }
      & {
        data: Record<string, any>;
      },
  ): Promise<any | void> | any | void;
  params: Array<InField>;
};
