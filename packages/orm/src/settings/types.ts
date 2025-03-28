import type { ORMFieldDef } from "#/field/field-def-types.ts";
import type { BaseTypeConfig, BaseTypeInfo } from "#/shared/shared-types.ts";
import type { ORMFieldType } from "#/field/types.ts";

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
    type: ORMFieldType;
  };
}
