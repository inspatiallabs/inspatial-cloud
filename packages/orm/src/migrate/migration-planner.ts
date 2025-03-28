import type { EntryMigrationPlan } from "#/migrate/entry-type/entry-migration-plan.ts";
import { EntryTypeMigrator } from "#/migrate/entry-type/entry-type-migrator.ts";
import type { InSpatialORM } from "#/inspatial-orm.ts";
import type { InSpatialDB } from "#db/inspatial-db.ts";
import type { EntryType } from "#/entry/entry-type.ts";
import { SettingsTypeMigrator } from "#/migrate/settings-type/settings-type-migrator.ts";
import type { SettingsType } from "#/settings/settings-type.ts";
import type { PgColumnDefinition } from "#db/types.ts";
import type { SettingsRow } from "#/settings/types.ts";
import { MigrationPlan } from "#/migrate/migration-plan.ts";

export class MigrationPlanner {
  entryTypes: Map<string, EntryTypeMigrator>;
  settingsTypes: Map<string, SettingsTypeMigrator>;
  orm: InSpatialORM;
  db: InSpatialDB;
  migrationPlan: MigrationPlan;
  onOutput: (message: string) => void;
  #results: Array<string>;
  constructor(config: {
    entryTypes: Array<EntryType>;
    settingsTypes: Array<SettingsType>;
    orm: InSpatialORM;
    onOutput: (message: string) => void;
  }) {
    const { entryTypes, settingsTypes, orm, onOutput } = config;
    this.entryTypes = new Map();
    this.settingsTypes = new Map();
    this.migrationPlan = new MigrationPlan();
    this.orm = orm;
    this.db = orm.db;
    this.onOutput = onOutput;
    this.#results = [];
    for (const entryType of entryTypes) {
      this.entryTypes.set(
        entryType.name,
        new EntryTypeMigrator({ entryType, orm, onOutput }),
      );
    }
    for (const settingsType of settingsTypes) {
      this.settingsTypes.set(
        settingsType.name,
        new SettingsTypeMigrator({ settingsType, orm, onOutput }),
      );
    }
  }

  #logResult(message: string): void {
    this.onOutput(message);
    this.#results.push(message);
  }

  async createMigrationPlan(): Promise<MigrationPlan> {
    this.migrationPlan = new MigrationPlan();
    this.migrationPlan.database = this.db.dbName;
    this.migrationPlan.schema = this.db.schema;

    for (const migrator of this.entryTypes.values()) {
      const plan = await migrator.planMigration();
      this.migrationPlan.summary.addColumns += plan.columns.create.length;
      this.migrationPlan.summary.dropColumns += plan.columns.drop.length;
      this.migrationPlan.summary.modifyColumns += plan.columns.modify.length;
      this.migrationPlan.summary.createTables += plan.table.create ? 1 : 0;
      this.migrationPlan.entries.push(plan);
    }
    const hasSettingsTable = await this.db.tableExists(
      "inSettings",
    );
    if (!hasSettingsTable) {
      this.migrationPlan.settingsTable.create = true;
      this.migrationPlan.summary.createTables++;
    }
    for (const migrator of this.settingsTypes.values()) {
      const plan = await migrator.planMigration();
      this.migrationPlan.summary.addSettingsFields += plan.fields.create.length;
      this.migrationPlan.summary.dropSettingsFields += plan.fields.drop.length;
      this.migrationPlan.summary.modifySettingsFields +=
        plan.fields.modify.length;
      this.migrationPlan.settings.push(plan);
    }

    return this.migrationPlan;
  }

  async migrate(): Promise<Array<string>> {
    await this.createMigrationPlan();
    await this.#verifySettingsTable();
    await this.#migrateEntryTypes();
    await this.#migrateSettingsTypes();
    return this.#results;
  }

  async #migrateEntryTypes(): Promise<void> {
    await this.#createMissingTables();
    await this.#updateTablesDescriptions();
    await this.#syncColumns();
  }

  async #migrateSettingsTypes(): Promise<void> {
    for (const plan of this.migrationPlan.settings) {
      for (const field of plan.fields.create) {
        await this.db.insertRow("inSettings", field);
        this.#logResult(
          `Created field ${field.field} for settings type ${plan.settingsType}`,
        );
      }
      for (const field of plan.fields.drop) {
        await this.db.deleteRow("inSettings", field.id);
        this.#logResult(
          `Dropped field ${field.field} for settings type ${plan.settingsType}`,
        );
      }
      for (const field of plan.fields.modify) {
        await this.db.updateRow("inSettings", field.id, {
          value: field.value,
        });
      }
    }
  }

  async #createMissingTables(): Promise<void> {
    for (const plan of this.migrationPlan.entries) {
      if (plan.table.create) {
        await this.db.createTable(plan.table.tableName, plan.table.idMode);
        this.onOutput(`Created table ${plan.table.tableName}`);
      }
    }
  }

  async #updateTablesDescriptions(): Promise<void> {
    for (const plan of this.migrationPlan.entries) {
      if (plan.table.updateDescription) {
        await this.db.addTableComment(
          plan.table.tableName,
          plan.table.updateDescription.to,
        );
        this.#logResult(
          `Updated table description for ${plan.table.tableName} from ${plan.table.updateDescription.from} to ${plan.table.updateDescription.to}`,
        );
      }
    }
  }

  async #syncColumns(): Promise<void> {
    for (const plan of this.migrationPlan.entries) {
      await this.#createMissingColumns(plan);
      await this.#modifyColumns(plan);
      await this.#dropColumns(plan);
    }
  }
  async #createMissingColumns(plan: EntryMigrationPlan): Promise<void> {
    for (const columnPlan of plan.columns.create) {
      await this.db.addColumn(plan.table.tableName, columnPlan.column);
      if (columnPlan.foreignKey?.create) {
        await this.db.addForeignKey(columnPlan.foreignKey.create);
      }
      this.#logResult(
        `Added column ${columnPlan.columnName} to table ${plan.table.tableName}`,
      );
    }
  }

  async #modifyColumns(plan: EntryMigrationPlan): Promise<void> {
    const tableName = plan.table.tableName;

    for (const column of plan.columns.modify) {
      const { nullable, dataType, unique, foreignKey } = column;
      if (unique) {
        switch (unique.to) {
          case true:
            await this.db.makeColumnUnique(
              tableName,
              column.columnName,
            );
            this.#logResult(`Made column ${column.columnName} unique`);
            break;
          case false:
            await this.db.removeColumnUnique(
              tableName,
              column.columnName,
            );
            this.#logResult(
              `Removed unique constraint from column ${column.columnName}`,
            );
            break;
        }
      }
      if (nullable) {
        await this.db.setColumnNull(
          tableName,
          column.columnName,
          nullable.to === "YES",
        );
      }
      if (dataType) {
        await this.db.changeColumnDataType(
          tableName,
          column.columnName,
          dataType.to,
        );
      }
      if (foreignKey) {
        const { drop, create } = foreignKey;
        if (create) {
          await this.db.addForeignKey({
            columnName: create.columnName,
            foreignColumnName: create.foreignColumnName,
            foreignTableName: create.foreignTableName,
            constraintName: create.constraintName,
            tableName: create.tableName,
          });
          this.#logResult(
            `Added foreign key constraint ${create.constraintName} to column ${create.columnName}`,
          );
        }
      }
    }
  }

  #dropColumns(plan: EntryMigrationPlan): void {
    for (const column of plan.columns.drop) {
      this.db.removeColumn(plan.table.tableName, column.columnName);
      this.#logResult(
        `Dropped column ${column.columnName} from table ${plan.table.tableName}`,
      );
    }
  }

  async #verifySettingsTable(): Promise<void> {
    if (this.migrationPlan.settingsTable.create) {
      await this.db.createTable("inSettings", "manual");
    }

    const columns: Array<PgColumnDefinition> = [{
      columnName: "settingsType",
      dataType: "character varying",
      characterMaximumLength: 255,
      isNullable: "NO",
    }, {
      columnName: "field",
      dataType: "character varying",
      characterMaximumLength: 255,
      isNullable: "NO",
    }, {
      columnName: "value",
      dataType: "jsonb",
      isNullable: "NO",
    }];

    const existingColumns = await this.db.getTableColumns("inSettings");
    const existingColumnsMap = new Map(
      existingColumns.map((c) => [c.columnName, c]),
    );
    for (const column of columns) {
      const existingColumn = existingColumnsMap.get(column.columnName);
      if (existingColumn) {
        if (existingColumn.dataType !== column.dataType) {
          await this.db.changeColumnDataType("inSettings", column.columnName, {
            dataType: column.dataType,
            characterMaximumLength: column.characterMaximumLength,
          });
        }
        continue;
      }
      await this.db.addColumn("inSettings", column);
    }
    const hasIndex = await this.db.hasIndex(
      "inSettings",
      "in_settings_settings_type",
    );
    if (!hasIndex) {
      await this.db.createIndex({
        tableName: "inSettings",
        columns: ["settingsType"],
        indexName: "in_settings_settings_type",
      });
    }
  }
}
