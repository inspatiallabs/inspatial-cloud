import type { Settings } from "~/orm/settings/settings.ts";
import type { SettingsName } from "#types/models.ts";
type HashString = `$${string}`;
export interface SettingsBase<
  S extends SettingsName = SettingsName,
  Fields = Record<string, any>,
> extends Settings<S> {
  __fields__: Fields;
  [key: HashString]: any;
}

export interface GenericSettings
  extends SettingsBase<SettingsName, Record<string, any>> {
  [key: string]: any;
}
