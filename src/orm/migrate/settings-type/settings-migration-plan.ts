import type { SettingsRow } from "#/orm/settings/types.ts";

export class SettingsMigrationPlan {
  settingsType: string;

  fields: {
    create: Array<Omit<SettingsRow, "updatedAt">>;
    drop: Array<Omit<SettingsRow, "updatedAt">>;
    modify: Array<Omit<SettingsRow, "updatedAt">>;
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
