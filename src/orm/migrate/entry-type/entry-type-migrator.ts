import { EntryType } from "~/orm/entry/entry-type.ts";
import type { InSpatialORM } from "~/orm/inspatial-orm.ts";
import type {
  ForeignKeyConstraint,
  PgColumnDefinition,
  PostgresColumn,
  TableConstraint,
  TableIndex,
} from "~/orm/db/db-types.ts";
import { EntryMigrationPlan } from "~/orm/migrate/entry-type/entry-migration-plan.ts";
import type { InField, InFieldType } from "~/orm/field/field-def-types.ts";
import type {
  ColumnCreatePlan,
  ColumnMigrationPlan,
} from "~/orm/migrate/types.ts";
import {
  compareDataTypes,
  compareNullable,
} from "~/orm/migrate/migrate-utils.ts";

import type { ChildEntryType } from "~/orm/child-entry/child-entry.ts";
import { raiseORMException } from "~/orm/orm-exception.ts";
import { BaseMigrator } from "~/orm/migrate/shared/base-migrator.ts";
import type { EntryIndex } from "~/orm/entry/types.ts";
import { convertString } from "~/utils/mod.ts";
import type { InSpatialDB } from "../../db/inspatial-db.ts";
import type { EntryName } from "#types/models.ts";

export class EntryTypeMigrator<T extends EntryType | ChildEntryType>
  extends BaseMigrator<EntryType> {
  get entryType(): T {
    return this.typeDef as T;
  }
  existingColumns: Map<string, PostgresColumn>;
  targetColumns: Map<string, PgColumnDefinition>;
  isChild: boolean = false;

  existingConstraints: {
    unique: Map<string, TableConstraint>;
    primaryKey: Map<string, TableConstraint>;
    foreignKey: Map<string, TableConstraint>;
  };
  targetConstraints: {
    unique: Map<string, TableConstraint>;
    primaryKey: Map<string, TableConstraint>;
    foreignKey: Map<string, ForeignKeyConstraint>;
  };
  existingIndexes: Map<string, TableIndex>;
  targetIndexes: Map<string, EntryIndex<string>>;

  get #tableName(): string {
    if (!this.entryType.config.tableName) {
      raiseORMException(
        `EntryType ${this.entryType.name} does not have a tableName defined`,
      );
    }
    return this.entryType.config.tableName;
  }
  constructor(
    config: {
      entryType: T;
      db: InSpatialDB;
      orm: InSpatialORM;
      onOutput: (message: string) => void;
      isChild?: boolean;
    },
  ) {
    super({
      orm: config.orm,
      db: config.db,
      onOutput: config.onOutput,
      typeDef: config.entryType as EntryType,
    });
    this.isChild = config.isChild || false;
    this.existingColumns = new Map();
    this.targetColumns = new Map();
    this.existingIndexes = new Map();
    this.targetIndexes = new Map();
    this.existingConstraints = {
      unique: new Map(),
      primaryKey: new Map(),
      foreignKey: new Map(),
    };
    this.targetConstraints = {
      unique: new Map(),
      primaryKey: new Map(),
      foreignKey: new Map(),
    };
    this.migrationPlan = new EntryMigrationPlan(this.entryType.name);
  }
  async migrate(): Promise<any> {
    await this.planMigration();
    await this.#createTableIfNotExists();
    await this.#syncTableDescription();
    await this.#migrateColumns();
    await this.#syncIndexes();
  }

  async planMigration(): Promise<EntryMigrationPlan> {
    this.migrationPlan = new EntryMigrationPlan(this.entryType.name);
    this.migrationPlan.table.tableName = this.#tableName;
    await this.#checkTableInfo();
    this.#loadTargetColumns();
    this.#loadTargetIndexes();
    await this.#loadExistingIndexes();
    if (!this.migrationPlan.table.create) {
      await this.#loadExistingColumns();
      await this.#loadExistingConstraints();
      this.#checkForColumnsToDrop();
      this.#checkForColumnsToModify();
    }
    this.#checkForColumnsToCreate();

    if (!this.isChild) {
      await this.loadExistingChildren();
      await this.makeChildrenMigrationPlan();
    }
    return this.migrationPlan;
  }

  async #createTableIfNotExists() {
    const { table } = this.migrationPlan;
    if (table.create) {
      await this.db.createTable(table.tableName, table.idMode);
    }
  }
  async #syncTableDescription() {
    const { table } = this.migrationPlan;
    if (table.updateDescription) {
      await this.db.addTableComment(
        table.tableName,
        table.updateDescription.to,
      );
    }
  }
  async #migrateColumns(): Promise<void> {
    const plan = this.migrationPlan;
    // create missing columns
    for (const columnPlan of plan.columns.create) {
      await this.db.addColumn(plan.table.tableName, columnPlan.column);
      if (columnPlan.foreignKey?.create) {
        await this.db.addForeignKey(columnPlan.foreignKey.create);
      }
    }
    // modify existing columns
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
            break;
          case false:
            await this.db.removeColumnUnique(
              tableName,
              column.columnName,
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
            global: create.global,
          });
        }
        if (drop) {
          await this.db.removeForeignKey(tableName, drop);
        }
      }
    }
    // drop extra columns
    for (const column of plan.columns.drop) {
      await this.db.removeColumn(plan.table.tableName, column.columnName);
    }
  }
  async #syncIndexes() {
    const plan = this.migrationPlan;
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
  async #loadExistingColumns(): Promise<void> {
    const columns = await this.db.getTableColumns(this.#tableName);
    for (const column of columns) {
      this.existingColumns.set(column.columnName, column);
    }
  }

  async #loadExistingIndexes() {
    const result = await this.db.getTableIndexes(this.#tableName);

    for (const index of result) {
      if (!index.indexname.startsWith("idx_")) {
        continue;
      }

      this.existingIndexes.set(index.indexname, index);
    }
  }
  #loadTargetIndexes() {
    if (this.entryType instanceof EntryType) {
      for (const index of this.entryType.config.index) {
        const indexName = `idx_${this.#tableName}_${
          index.fields.map((f) => convertString(f, "snake")).join("_")
        }`;
        this.targetIndexes.set(indexName, index);
      }
    }
  }
  #validateIndexes() {
    for (const indexName of this.existingIndexes.keys()) {
      if (!this.targetIndexes.has(indexName)) {
        this.migrationPlan.indexes.drop.push(indexName);
      }
    }
    for (const [indexName, index] of this.targetIndexes.entries()) {
      if (!this.existingIndexes.has(indexName)) {
        this.migrationPlan.indexes.create.push({ ...index, indexName });
      }
    }
  }
  async #loadExistingConstraints(): Promise<void> {
    const constraints = await this.db.getTableConstraints(this.#tableName);

    for (const constraint of constraints) {
      switch (constraint.constraintType) {
        case "UNIQUE":
          this.existingConstraints.unique.set(
            constraint.columnName,
            constraint,
          );
          break;
        case "PRIMARY KEY":
          this.existingConstraints.primaryKey.set(
            constraint.columnName,
            constraint,
          );
          break;
        case "FOREIGN KEY":
          this.existingConstraints.foreignKey.set(
            constraint.columnName,
            constraint,
          );
          break;
      }
    }
  }

  #loadTargetColumns(): void {
    for (const inField of this.entryType.fields.values()) {
      const field = inField as InField<InFieldType> & { global?: boolean };
      if (field.key == "id") {
        const idField = field as InField<"IDField">;
        this.migrationPlan.table.idMode = idField.idMode;
        // continue;
      }
      const ormField = this.orm._getFieldType(field.type);
      const dbColumn = ormField.generateDbColumn(field);
      this.targetColumns.set(field.key, dbColumn);
      let connectionEntryType: EntryType | undefined;
      switch (field.type) {
        case "ConnectionField":
          connectionEntryType = this.orm.getEntryType(
            field.entryType as EntryName,
          );
          break;
        case "ImageField":
        case "FileField":
          if (!field.entryType) {
            raiseORMException(
              `Field ${field.key} in EntryType ${this.entryType.name} is a ${field.type} but does not have an entryType defined.`,
            );
          }
          connectionEntryType = this.orm.getEntryType(
            field.entryType as EntryName,
          );
          break;
        default:
          continue;
      }
      const titleField = this.entryType.connectionTitleFields.get(field.key);
      if (titleField) {
        const ormTitleField = this.orm._getFieldType(titleField.type);
        const dbTitleColumn = ormTitleField.generateDbColumn(titleField);
        this.targetColumns.set(titleField.key, dbTitleColumn);
      }
      this.targetConstraints.foreignKey.set(field.key, {
        columnName: field.key,
        constraintName: `${
          field.global ? "global_" : ""
        }${this.#tableName}_${field.key}_fk`,
        foreignColumnName: "id",
        foreignTableName: connectionEntryType.config.tableName,
        tableName: this.#tableName,
        global: field?.global,
      });
    }
  }

  #checkForColumnsToDrop(): void {
    for (const column of this.existingColumns.values()) {
      if (!this.targetColumns.has(column.columnName)) {
        this.migrationPlan.columns.drop.push({
          columnName: column.columnName,
        });
      }
    }
  }

  #checkForColumnsToCreate(): void {
    for (const column of this.targetColumns.values()) {
      if (!this.existingColumns.has(column.columnName)) {
        const foreignKey = this.#getColumnForeignKeyConstraint(
          column.columnName,
        );
        const columnPlan: ColumnCreatePlan = {
          columnName: column.columnName,
          column: column,
        };
        if (foreignKey?.create) {
          columnPlan.foreignKey = {
            create: foreignKey.create,
          };
        }
        this.migrationPlan.columns.create.push(columnPlan);
      }
    }
  }
  async #checkTableInfo(): Promise<void> {
    const tableExists = await this.db.tableExists(this.#tableName);
    const newDescription = this.entryType.config.description || null;
    if (!tableExists) {
      this.migrationPlan.table.create = true;
      this.migrationPlan.table.updateDescription = {
        from: "",
        to: newDescription ?? "",
      };
      return;
    }
    const existingDescription = await this.db.getTableComment(this.#tableName);
    this.migrationPlan.table.create = false;
    if (existingDescription != newDescription) {
      this.migrationPlan.table.updateDescription = {
        from: existingDescription,
        to: newDescription ?? "",
      };
    }
  }

  #checkForColumnsToModify(): void {
    for (const [columnName, newColumn] of this.targetColumns) {
      const existing = this.existingColumns.get(columnName);
      if (existing) {
        let hasChanges = false;
        const dataTypes = compareDataTypes(existing, newColumn);
        const nullable = compareNullable(existing, newColumn);
        const columnPlan: ColumnMigrationPlan = {
          columnName: columnName,
        };

        const existingUnique = this.existingConstraints.unique.get(columnName);
        if (!this.isChild) {
          if (existingUnique && !newColumn.unique) {
            hasChanges = true;
            columnPlan.unique = {
              from: true,
              to: false,
            };
          }
          if (!existingUnique && newColumn.unique) {
            hasChanges = true;
            columnPlan.unique = {
              from: false,
              to: true,
            };
          }
        }
        const foreignKey = this.#getColumnForeignKeyConstraint(columnName);
        if (foreignKey) {
          hasChanges = true;
          columnPlan.foreignKey = foreignKey;
        }
        if (dataTypes) {
          hasChanges = true;
          columnPlan.dataType = dataTypes;
        }
        if (nullable) {
          hasChanges = true;
          columnPlan.nullable = nullable;
        }
        if (hasChanges) {
          this.migrationPlan.columns.modify.push(columnPlan);
        }
      }
    }
  }

  #getColumnForeignKeyConstraint(
    columnName: string,
  ): ColumnMigrationPlan["foreignKey"] {
    const existing = this.existingConstraints.foreignKey.get(columnName);
    const target = this.targetConstraints.foreignKey.get(columnName);
    if (existing && target) {
      return;
    }
    if (existing && !target) {
      return {
        drop: existing.constraintName,
      };
    }

    if (!existing && target) {
      return {
        create: target,
      };
    }
  }
}
