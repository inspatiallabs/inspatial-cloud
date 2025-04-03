import type { Settings } from "#/settings/settings.ts";

export interface SettingsBase extends Settings<any> {
}

export interface GenericSettings extends SettingsBase {
  [key: string]: any;
}
