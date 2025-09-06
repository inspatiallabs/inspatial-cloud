import type { Settings } from "~/orm/settings/settings.ts";
type HashString = `$${string}`;
export interface SettingsBase<Fields = Record<string, any>>
  extends Settings<any> {
  __fields__: Fields;
  [key: HashString]: any;
}

export interface GenericSettings extends SettingsBase<Record<string, any>> {
  [key: string]: any;
}
