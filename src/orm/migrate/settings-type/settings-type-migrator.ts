import type { SettingsType } from "~/orm/settings/settings-type.ts";
import { SettingsMigrationPlan } from "~/orm/migrate/settings-type/settings-migration-plan.ts";
import type { InSpatialORM } from "~/orm/inspatial-orm.ts";
import type { SettingsRow } from "~/orm/settings/types.ts";
import { BaseMigrator } from "~/orm/migrate/shared/base-migrator.ts";
import type { InSpatialDB } from "../../db/inspatial-db.ts";
import type {
  PostgresColumn,
  TableConstraint,
  TableIndex,
} from "../../db/db-types.ts";

export class SettingsTypeMigrator extends BaseMigrator<SettingsType> {
  get settingsType(): SettingsType {
    return this.typeDef as SettingsType;
  }

  override migrationPlan: SettingsMigrationPlan;

  existingFields: Map<string, Omit<SettingsRow, "updatedAt">>;
  targetFields: Map<string, Omit<SettingsRow, "updatedAt">>;

  constructor(
    config: {
      settingsType: SettingsType;
      orm: InSpatialORM;
      db: InSpatialDB;
      onOutput: (message: string) => void;
    },
  ) {
    super({
      orm: config.orm,
      db: config.db,
      onOutput: config.onOutput,
      typeDef: config.settingsType,
    });

    this.migrationPlan = new SettingsMigrationPlan(this.settingsType.name);
    this.existingFields = new Map();
    this.targetFields = new Map();
  }

  async planMigration(
    options: {
      indexes: Array<TableIndex>;
      columns: Array<PostgresColumn>;
      constraints: Array<TableConstraint>;
      tables: Set<string>;
      settingsColumns: Array<SettingsRow>;
    },
  ): Promise<SettingsMigrationPlan> {
    this.migrationPlan = new SettingsMigrationPlan(this.settingsType.name);
    this.#loadExistingFields(options.settingsColumns);
    this.#loadTargetFields();
    this.#checkForFieldsToCreate();
    this.#checkForFieldsToDrop();
    this.#checkForFieldsToModify();
    this.loadExistingChildren(options.columns);
    await this.makeChildrenMigrationPlan(options);
    return this.migrationPlan;
  }

  async migrate(): Promise<void> {}

  #loadExistingFields(settingsColumns: Array<SettingsRow>): void {
    const cols = settingsColumns.filter((col) =>
      col.settingsType === this.settingsType.name
    );
    this.existingFields = new Map(cols.map((col) => [col.field, col]));
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
