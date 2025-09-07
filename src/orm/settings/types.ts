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
import type { SettingsMap, SettingsName } from "#types/models.ts";

export interface SettingsTypeInfo extends BaseTypeInfo {
  config: SettingsTypeConfig;
  actions?: Array<SettingsActionDefinition>;
}

export interface SettingsTypeConfig extends BaseTypeConfig {
}
export type SettingsConfig<S extends SettingsName = SettingsName> =
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
export type SettingsHookFunction<S extends SettingsName = SettingsName> = {
  (
    hookParams:
      & {
        inCloud: InCloud;
        orm: InSpatialORM;
      }
      & {
        [K in S | "settings"]: S extends SettingsName ? SettingsMap[S]
          : GenericSettings;
      },
  ): Promise<void> | void;
};
export type SettingsHookDefinition<S extends SettingsName = SettingsName> = {
  name: string;
  description?: string;
  handler: SettingsHookFunction<S>;
};

export type SettingsActionDefinition<S extends SettingsName = SettingsName> = {
  key: string;
  description?: string;
  label?: string;
  private?: boolean;
  action(
    actionParams:
      & {
        orm: InSpatialORM;
        inCloud: InCloud;
      }
      & {
        [K in S | "settings"]: S extends SettingsName ? SettingsMap[S]
          : GenericSettings;
      }
      & {
        data: Record<string, any>;
      },
  ): Promise<any | void> | any | void;
  params: Array<InField>;
};
