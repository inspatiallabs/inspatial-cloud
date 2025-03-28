import type { SettingsType } from "#/settings/settings-type.ts";
import type { SettingsRow } from "#/settings/types.ts";

export class SettingsMigrationPlan {
  settingsType: string;

  fields: {
    create: Array<SettingsRow>;
    drop: Array<SettingsRow>;
    modify: Array<SettingsRow>;
  };

  constructor(settingsType: string) {
    this.settingsType = settingsType;
    this.fields = {
      create: [],
      drop: [],
      modify: [],
    };
  }
}
