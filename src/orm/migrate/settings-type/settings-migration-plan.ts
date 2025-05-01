import type { SettingsRow } from "#/orm/settings/types.ts";
import type { EntryMigrationPlan } from "#/orm/migrate/entry-type/entry-migration-plan.ts";

export class SettingsMigrationPlan {
  settingsType: string;

  fields: {
    create: Array<Omit<SettingsRow, "updatedAt">>;
    drop: Array<Omit<SettingsRow, "updatedAt">>;
    modify: Array<Omit<SettingsRow, "updatedAt">>;
  };
  children: Array<EntryMigrationPlan>;

  constructor(settingsType: string) {
    this.settingsType = settingsType;
    this.fields = {
      create: [],
      drop: [],
      modify: [],
    };
    this.children = [];
  }
}
