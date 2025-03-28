import type { EntryMigrationPlan } from "#/migrate/entry-type/entry-migration-plan.ts";
import { EntryTypeMigrator } from "#/migrate/entry-type/entry-type-migrator.ts";
import type { InSpatialORM } from "#/inspatial-orm.ts";
import type { InSpatialDB } from "#db/inspatial-db.ts";
import type { EntryType } from "#/entry/entry-type.ts";

export class MigrationPlanner {
  entryTypes: Map<string, EntryTypeMigrator>;
  orm: InSpatialORM;
  db: InSpatialDB;
  migrationPlan: Array<EntryMigrationPlan>;
  onOutput: (message: string) => void;
  #results: Array<string>;
  constructor(
    entryTypes: EntryType[],
    orm: InSpatialORM,
    onOutput: (message: string) => void,
  ) {
    this.entryTypes = new Map();
    this.migrationPlan = [];
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
  }

  #logResult(message: string): void {
    this.onOutput(message);
    this.#results.push(message);
  }

  async createMigrationPlan(): Promise<EntryMigrationPlan[]> {
    this.migrationPlan = [];
    for (const migrator of this.entryTypes.values()) {
      const plan = await migrator.planMigration();
      this.migrationPlan.push(plan);
    }

    return this.migrationPlan;
  }

  async migrate(): Promise<Array<string>> {
    await this.createMigrationPlan();
    await this.#createMissingTables();
    await this.#updateTablesDescriptions();
    await this.#syncColumns();
    return this.#results;
  }

  async #createMissingTables(): Promise<void> {
    for (const plan of this.migrationPlan) {
      if (plan.table.create) {
        await this.db.createTable(plan.table.tableName, plan.table.idMode);
        this.onOutput(`Created table ${plan.table.tableName}`);
      }
    }
  }

  async #updateTablesDescriptions(): Promise<void> {
    for (const plan of this.migrationPlan) {
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
    for (const plan of this.migrationPlan) {
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
}
