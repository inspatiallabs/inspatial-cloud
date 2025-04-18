import type { SettingsType } from "#/orm/settings/settings-type.ts";
import { SettingsMigrationPlan } from "#/orm/migrate/settings-type/settings-migration-plan.ts";
import type { InSpatialORM } from "#/orm/inspatial-orm.ts";
import type { InSpatialDB } from "#/orm/db/inspatial-db.ts";
import type { SettingsRow } from "#/orm/settings/types.ts";

export class SettingsTypeMigrator {
  orm: InSpatialORM;

  db: InSpatialDB;
  settingsType: SettingsType;
  migrationPlan: SettingsMigrationPlan;

  existingFields: Map<string, Omit<SettingsRow, "updatedAt">>;
  targetFields: Map<string, Omit<SettingsRow, "updatedAt">>;

  log: (message: string) => void;
  constructor(
    config: {
      settingsType: SettingsType;
      orm: InSpatialORM;
      onOutput: (message: string) => void;
    },
  ) {
    const { settingsType, orm, onOutput } = config;
    this.settingsType = settingsType;
    this.migrationPlan = new SettingsMigrationPlan(settingsType.name);
    this.log = onOutput;
    this.orm = orm;
    this.db = orm.db;
    this.existingFields = new Map();
    this.targetFields = new Map();
  }

  async planMigration(): Promise<SettingsMigrationPlan> {
    this.migrationPlan = new SettingsMigrationPlan(this.settingsType.name);
    await this.#loadExistingFields();
    this.#loadTargetFields();
    this.#checkForFieldsToCreate();
    this.#checkForFieldsToDrop();
    this.#checkForFieldsToModify();
    return this.migrationPlan;
  }

  async migrate(): Promise<void> {}

  async #loadExistingFields(): Promise<void> {
    const hasTable = await this.db.tableExists("inSettings");
    if (!hasTable) {
      return;
    }
    const result = await this.db.getRows<SettingsRow>("inSettings", {
      filter: {
        settingsType: this.settingsType.name,
      },
      columns: ["id", "settingsType", "field", "value"],
    });
    this.existingFields = new Map();
    for (const row of result.rows) {
      const { field, value } = row;
      this.existingFields.set(field, row);
    }
  }

  #loadTargetFields(): void {
    for (const field of this.settingsType.fields.values()) {
      const { key, type } = field;
      this.targetFields.set(key, {
        id: `${this.settingsType.name}:${key}`,
        settingsType: this.settingsType.name,
        field: key,
        value: {
          value: field.defaultValue,
          type,
        },
      });
    }
  }

  #checkForFieldsToCreate(): void {
    for (const field of this.targetFields.values()) {
      if (!this.existingFields.has(field.field)) {
        this.migrationPlan.fields.create.push(field);
      }
    }
  }
  #checkForFieldsToDrop(): void {
    for (const field of this.existingFields.values()) {
      if (!this.targetFields.has(field.field)) {
        this.migrationPlan.fields.drop.push(field);
      }
    }
  }
  #checkForFieldsToModify(): void {
    for (const field of this.targetFields.values()) {
      const existingField = this.existingFields.get(field.field);
      if (!existingField) {
        continue;
      }
      if (existingField.value.type !== field.value.type) {
        this.migrationPlan.fields.modify.push(field);
      }
    }
  }
}
