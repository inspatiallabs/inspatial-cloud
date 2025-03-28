import type { ORMFieldDef } from "#/field/field-def-types.ts";
import type { BaseTypeConfig, BaseTypeInfo } from "#/shared/shared-types.ts";

export interface SettingsTypeInfo extends BaseTypeInfo {
  config: SettingsTypeConfig;
}

export interface SettingsTypeConfig extends BaseTypeConfig {
}
