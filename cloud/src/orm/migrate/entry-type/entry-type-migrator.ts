import type { EntryType } from "#/orm/entry/entry-type.ts";
import type { InSpatialORM } from "#/orm/inspatial-orm.ts";
import type { InSpatialDB } from "#/orm/db/inspatial-db.ts";
import type {
  ForeignKeyConstraint,
  PgColumnDefinition,
  PostgresColumn,
  TableConstraint,
} from "#/orm/db/db-types.ts";
import { EntryMigrationPlan } from "#/orm/migrate/entry-type/entry-migration-plan.ts";
import type { FieldDefMap } from "#/orm/field/field-def-types.ts";
import type {
  ColumnCreatePlan,
  ColumnMigrationPlan,
} from "#/orm/migrate/types.ts";
import {
  compareDataTypes,
  compareNullable,
} from "#/orm/migrate/migrate-utils.ts";
import convertString from "#/utils/convert-string.ts";

import type { ChildEntryType } from "#/orm/child-entry/child-entry.ts";
import { raiseORMException } from "#/orm/orm-exception.ts";

export class EntryTypeMigrator<T extends EntryType | ChildEntryType> {
  entryType: T;
  orm: InSpatialORM;
  log: (message: string) => void;
  db: InSpatialDB;
  existingColumns: Map<string, PostgresColumn>;
  targetColumns: Map<string, PgColumnDefinition>;
  isChild: boolean = false;
  existingChildren: Map<string, any>;
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
      orm: InSpatialORM;
      onOutput: (message: string) => void;
      isChild?: boolean;
    },
  ) {
    const { entryType, orm, onOutput } = config;
    this.isChild = config.isChild || false;
    this.log = onOutput;
    this.entryType = entryType;
    this.orm = orm;
    this.db = orm.db;
    this.existingColumns = new Map();
    this.targetColumns = new Map();
    this.existingChildren = new Map();

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
    if (!this.isChild) {
      await this.#loadExistingChildren();
      await this.#makeChildrenMigrationPlan();
    }
    return this.migrationPlan;
  }
  async #loadExistingChildren(): Promise<void> {
    const result = await this.db.getRows<{ tableName: string }>("tables", {
      columns: ["tableName"],
      filter: {
        tableSchema: this.db.schema,
        tableName: {
          op: "startsWith",
          value: convertString(`child_${this.entryType.name}`, "snake", true),
        },
      },
    }, "information_schema");
    for (const row of result.rows) {
      const columns = await this.db.getTableColumns(row.tableName);
      const tableName = convertString(row.tableName, "camel");
      this.existingChildren.set(tableName, {
        tableName,
        columns: columns,
      });
    }
  }
  async #makeChildrenMigrationPlan() {
    if (!this.entryType.children) {
      return;
    }
    for (const child of this.entryType.children.values()) {
      const migrationPlan = await this.#generateChildMigrationPlan(child);
      this.migrationPlan.children.push(migrationPlan);
    }
  }
  async #generateChildMigrationPlan(child: ChildEntryType<any>) {
    const migrationPlan = new EntryTypeMigrator({
      entryType: child,
      orm: this.orm,
      onOutput: this.log,
      isChild: true,
    });

    return await migrationPlan.planMigration();
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
        const titleField = this.entryType.connectionTitleFields.get(field.key);

        if (titleField) {
          const ormTitleField = this.orm._getFieldType(titleField.type);
          const dbTitleColumn = ormTitleField.generateDbColumn(titleField);
          this.targetColumns.set(titleField.key, dbTitleColumn);
        }
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
