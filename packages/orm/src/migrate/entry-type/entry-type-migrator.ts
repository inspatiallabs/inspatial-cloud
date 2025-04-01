import type { EntryType } from "#/entry/entry-type.ts";
import type { InSpatialORM } from "#/inspatial-orm.ts";
import type { InSpatialDB } from "#db/inspatial-db.ts";
import type {
  ForeignKeyConstraint,
  PgColumnDefinition,
  PostgresColumn,
  TableConstraint,
} from "#db/types.ts";
import { EntryMigrationPlan } from "#/migrate/entry-type/entry-migration-plan.ts";
import type { FieldDefMap } from "#/field/field-def-types.ts";
import type { ColumnCreatePlan, ColumnMigrationPlan } from "#/migrate/types.ts";
import { compareDataTypes, compareNullable } from "#/migrate/migrate-utils.ts";
import { convertString } from "../../../../serve/src/utils/mod.ts";

export class EntryTypeMigrator {
  entryType: EntryType;
  orm: InSpatialORM;
  log: (message: string) => void;
  db: InSpatialDB;
  existingColumns: Map<string, PostgresColumn>;
  targetColumns: Map<string, PgColumnDefinition>;
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
  migrationPlan: EntryMigrationPlan;
  get #tableName(): string {
    return this.entryType.config.tableName;
  }
  constructor(
    config: {
      entryType: EntryType;
      orm: InSpatialORM;
      onOutput: (message: string) => void;
    },
  ) {
    const { entryType, orm, onOutput } = config;
    this.log = onOutput;
    this.entryType = entryType;
    this.orm = orm;
    this.db = orm.db;
    this.existingColumns = new Map();
    this.targetColumns = new Map();
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
    this.migrationPlan = new EntryMigrationPlan(entryType.name);
  }
  async migrate(): Promise<EntryMigrationPlan> {
    await this.planMigration();
    return this.migrationPlan;
  }

  async planMigration(): Promise<EntryMigrationPlan> {
    this.migrationPlan = new EntryMigrationPlan(this.entryType.name);
    this.migrationPlan.table.tableName = this.#tableName;
    await this.#checkTableInfo();
    this.#loadTargetColumns();
    if (this.migrationPlan.table.create) {
      this.#checkForColumnsToCreate();
      return this.migrationPlan;
    }
    await this.#loadExistingColumns();
    await this.#loadExistingConstraints();
    this.#checkForColumnsToDrop();
    this.#checkForColumnsToCreate();
    this.#checkForColumnsToModify();
    return this.migrationPlan;
  }

  async #loadExistingColumns(): Promise<void> {
    const columns = await this.db.getTableColumns(this.#tableName);
    for (const column of columns) {
      this.existingColumns.set(column.columnName, column);
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
    for (const field of this.entryType.fields.values()) {
      if (field.key == "id") {
        const idField = field as FieldDefMap["IDField"];
        this.migrationPlan.table.idMode = idField.idMode;
        continue;
      }
      const ormField = this.orm._getFieldType(field.type);
      const dbColumn = ormField.generateDbColumn(field);
      if (field.type === "ConnectionField") {
        const connectionEntry = this.orm.getEntryType(field.entryType);
        this.targetConstraints.foreignKey.set(field.key, {
          columnName: field.key,
          constraintName: `${this.#tableName}_${field.key}_fk`,
          foreignColumnName: "id",
          foreignTableName: connectionEntry.config.tableName,
          tableName: this.#tableName,
        });
      }
      this.targetColumns.set(field.key, dbColumn);
    }
  }

  #checkForColumnsToDrop(): void {
    for (const column of this.existingColumns.values()) {
      if (column.columnName == "id") {
        continue;
      }
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
    const newDescription = this.entryType.config.description;
    if (!tableExists) {
      this.migrationPlan.table.create = true;
      this.migrationPlan.table.updateDescription = {
        from: "",
        to: newDescription,
      };
      return;
    }
    const existingDescription = await this.db.getTableComment(this.#tableName);
    this.migrationPlan.table.create = false;
    if (existingDescription != newDescription) {
      this.migrationPlan.table.updateDescription = {
        from: existingDescription,
        to: newDescription,
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
