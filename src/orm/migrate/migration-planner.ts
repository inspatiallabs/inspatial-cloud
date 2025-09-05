import type { EntryMigrationPlan } from "~/orm/migrate/entry-type/entry-migration-plan.ts";
import { EntryTypeMigrator } from "~/orm/migrate/entry-type/entry-type-migrator.ts";
import type { InSpatialDB } from "~/orm/db/inspatial-db.ts";
import type { EntryType } from "~/orm/entry/entry-type.ts";
import { SettingsTypeMigrator } from "~/orm/migrate/settings-type/settings-type-migrator.ts";
import type { SettingsType } from "~/orm/settings/settings-type.ts";
import type { PgColumnDefinition } from "~/orm/db/db-types.ts";
import { MigrationPlan } from "~/orm/migrate/migration-plan.ts";
import type { InSpatialORM } from "../inspatial-orm.ts";
import { setupTagsTable } from "../../tags/tags.ts";

export class MigrationPlanner {
  entryTypes: Map<string, EntryTypeMigrator<EntryType>>;
  settingsTypes: Map<string, SettingsTypeMigrator>;
  db: InSpatialDB;
  migrationPlan: MigrationPlan;
  onOutput: (message: string) => void;
  #results: Array<string>;
  constructor(config: {
    entryTypes: Array<EntryType>;
    settingsTypes: Array<SettingsType>;
    db: InSpatialDB;
    orm: InSpatialORM;
    onOutput: (message: string) => void;
  }) {
    const { entryTypes, settingsTypes, onOutput, orm, db } = config;
    this.entryTypes = new Map();
    this.settingsTypes = new Map();
    this.migrationPlan = new MigrationPlan();
    this.db = db;
    this.onOutput = onOutput;
    this.#results = [];
    for (const entryType of entryTypes) {
      this.entryTypes.set(
        entryType.name,
        new EntryTypeMigrator({ entryType, orm, db, onOutput }),
      );
    }
    for (const settingsType of settingsTypes) {
      this.settingsTypes.set(
        settingsType.name,
        new SettingsTypeMigrator({ settingsType, orm, db, onOutput }),
      );
    }
  }

  #logResult(message: string): void {
    // this.onOutput(message);
    this.#results.push(message);
  }

  async createMigrationPlan(): Promise<MigrationPlan> {
    this.migrationPlan = new MigrationPlan();
    this.migrationPlan.database = this.db.dbName || "";
    this.migrationPlan.schema = this.db.schema;

    for (const migrator of this.entryTypes.values()) {
      const plan = await migrator.planMigration();
      this.migrationPlan.summary.addColumns += plan.columns.create.length;
      this.migrationPlan.summary.dropColumns += plan.columns.drop.length;
      this.migrationPlan.summary.modifyColumns += plan.columns.modify.length;
      this.migrationPlan.summary.createTables += plan.table.create ? 1 : 0;
      plan.children.forEach((child) => {
        this.migrationPlan.summary.createTables += child.table.create ? 1 : 0;
        this.migrationPlan.summary.addColumns += child.columns.create.length;
        this.migrationPlan.summary.dropColumns += child.columns.drop.length;
        this.migrationPlan.summary.modifyColumns += child.columns.modify.length;
      });
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
    await this.#validateSchema();
    await this.createMigrationPlan();
    await this.#verifyTagsTable();
    await this.#verifySettingsTable();
    await this.#migrateEntryTypes();
    await this.#migrateSettingsTypes();
    return this.#results;
  }
  async #validateSchema(): Promise<void> {
    const hasSchema = await this.db.hasSchema(this.db.schema);
    if (!hasSchema) {
      await this.db.createSchema(this.db.schema);
    }
  }
  async #verifyTagsTable(): Promise<void> {
    await setupTagsTable(this.db);
  }
  async #migrateEntryTypes(): Promise<void> {
    await this.#createMissingTables();
    await this.#updateTablesDescriptions();
    await this.#syncColumns();
    await this.#syncIndexes();
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
    const plans = [
      ...this.migrationPlan.entries,
      ...this.migrationPlan.settings.flatMap((plan) => plan.children),
    ];
    for (const plan of plans) {
      if (plan.table.create) {
        await this.db.createTable(plan.table.tableName, plan.table.idMode);
        this.#logResult(`Created table ${plan.table.tableName}`);
      }
      for (const child of plan.children) {
        if (child.table.create) {
          await this.db.createTable(child.table.tableName, child.table.idMode);
          this.#logResult(`Created child table ${child.table.tableName}`);
        }
      }
    }
  }

  async #updateTablesDescriptions(): Promise<void> {
    const updateDescription = async (plan: EntryMigrationPlan) => {
      if (plan.table.updateDescription) {
        await this.db.addTableComment(
          plan.table.tableName,
          plan.table.updateDescription.to,
        );
        this.#logResult(
          `Updated table description for ${plan.table.tableName} from ${plan.table.updateDescription.from} to ${plan.table.updateDescription.to}`,
        );
      }
    };
    const plans = [
      ...this.migrationPlan.entries,
      ...this.migrationPlan.settings.flatMap((plan) => plan.children),
    ];
    for (const plan of plans) {
      await updateDescription(plan);
      for (const child of plan.children) {
        await updateDescription(child);
      }
    }
  }

  async #syncColumns(): Promise<void> {
    const syncColumns = async (plan: EntryMigrationPlan) => {
      await this.#createMissingColumns(plan);
      await this.#modifyColumns(plan);
      await this.#dropColumns(plan);
    };
    const plans = [
      ...this.migrationPlan.entries,
      ...this.migrationPlan.settings.flatMap((plan) => plan.children),
    ];
    for (const plan of plans) {
      await syncColumns(plan);
      for (const child of plan.children) {
        await syncColumns(child);
      }
    }
  }
  async #syncIndexes() {
    for (const plan of this.migrationPlan.entries) {
      for (const indexName of plan.indexes.drop) {
        await this.db.dropIndex(plan.table.tableName, indexName);
      }
      for (const index of plan.indexes.create) {
        await this.db.createIndex({
          tableName: plan.table.tableName,
          indexName: index.indexName,
          columns: index.fields,
          unique: index.unique,
        });
      }
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
          nullable.defaultValue,
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
        if (drop) {
          await this.db.removeForeignKey(tableName, drop);
          this.#logResult(
            `Dropped foreign key constraint ${drop} from column ${column.columnName}`,
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
    }, {
      columnName: "updatedAt",
      dataType: "timestamp with time zone",
      isNullable: "NO",
      columnDefault: "now()",
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
