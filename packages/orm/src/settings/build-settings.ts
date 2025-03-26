import { SettingsType } from "#/settings/settings-type.ts";
import { Settings } from "#/settings/settings.ts";

export function buildSettings(
  settingsType: SettingsType,
): typeof Settings {
  const settingsClass = class extends Settings {
    _settingsType = settingsType;
  };

  return settingsClass;
}
