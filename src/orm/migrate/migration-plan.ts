import type { EntryMigrationPlan } from "/orm/migrate/entry-type/entry-migration-plan.ts";
import type { SettingsMigrationPlan } from "/orm/migrate/settings-type/settings-migration-plan.ts";

export class MigrationPlan {
  summary: {
    createTables: number;
    dropTables: number;
    addColumns: number;
    modifyColumns: number;
    dropColumns: number;
    addSettingsFields: number;
    modifySettingsFields: number;
    dropSettingsFields: number;
  };
  database: string;
  schema: string;
  settingsTable: {
    create: boolean;
  };
  entries: Array<EntryMigrationPlan>;
  settings: Array<SettingsMigrationPlan>;

  constructor() {
    this.summary = {
      createTables: 0,
      dropTables: 0,
      addColumns: 0,
      modifyColumns: 0,
      dropColumns: 0,
      addSettingsFields: 0,
      modifySettingsFields: 0,
      dropSettingsFields: 0,
    };
    this.database = "";
    this.schema = "";
    this.settingsTable = {
      create: false,
    };
    this.entries = [];
    this.settings = [];
  }
}
