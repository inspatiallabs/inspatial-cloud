import { EntryType } from "#/entry/entry-type.ts";
import { InSpatialORM } from "#/inspatial-orm.ts";
import { InSpatialDB } from "#db";
import {
  ForeignKeyConstraint,
  PgColumnDefinition,
  PgDataType,
  PgDataTypeDefinition,
  PostgresColumn,
  TableConstraint,
} from "#db/types.ts";
import { ormLogger } from "#/logger.ts";
import { IDMode } from "#/field/types.ts";
import { FieldDefMap } from "#/field/field-def-types.ts";

export async function migrateEntryType(
  entryType: EntryType,
  orm: InSpatialORM,
  onOutput: (message: string) => void,
) {
  const migrator = new EntryTypeMigrator({ entryType, orm, onOutput });
  return await migrator.migrate();
}
export class EntryMigrationPlan {
  entryType: string;
  table: {
    tableName: string;
    create: boolean;
    idMode: IDMode;
    updateDescription?: {
      from: string;
      to: string;
    };
  };
  columns: {
    create: Array<ColumnCreatePlan>;
    drop: Array<any>;
    modify: Array<ColumnMigrationPlan>;
  };
  constraints: {
    foreignKey: {
      create: Array<ForeignKeyConstraint>;
      drop: Array<ForeignKeyConstraint>;
    };
  };
  constructor(entryType: string) {
    this.entryType = entryType;
    this.table = {
      tableName: "",
      idMode: "ulid",
      create: false,
    };
    this.columns = {
      create: [],
      drop: [],
      modify: [],
    };

    this.constraints = {
      foreignKey: {
        create: [],
        drop: [],
      },
    };
  }
}

interface ColumnMigrationPlan {
  columnName: string;
  dataType?: {
    from: PgDataTypeDefinition;
    to: PgDataTypeDefinition;
  };
  nullable?: {
    from: PgColumnDefinition["isNullable"];
    to: PgColumnDefinition["isNullable"];
  };
  unique?: {
    from: boolean;
    to: boolean;
  };
  foreignKey?: {
    drop?: string;
    create?: ForeignKeyConstraint;
  };
}

interface ColumnCreatePlan {
  columnName: string;
  column: PgColumnDefinition;
  foreignKey?: {
    create: ForeignKeyConstraint;
  };
}

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

  #logResult(message: string) {
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

  async #createMissingTables() {
    for (const plan of this.migrationPlan) {
      if (plan.table.create) {
        await this.db.createTable(plan.table.tableName, plan.table.idMode);
        this.onOutput(`Created table ${plan.table.tableName}`);
      }
    }
  }

  async #updateTablesDescriptions() {
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

  async #syncColumns() {
    for (const plan of this.migrationPlan) {
      await this.#createMissingColumns(plan);
      await this.#modifyColumns(plan);
      await this.#dropColumns(plan);
    }
  }
  async #createMissingColumns(plan: EntryMigrationPlan) {
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

  async #modifyColumns(plan: EntryMigrationPlan) {
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

  #dropColumns(plan: EntryMigrationPlan) {
    for (const column of plan.columns.drop) {
      this.db.removeColumn(plan.table.tableName, column.columnName);
      this.#logResult(
        `Dropped column ${column.columnName} from table ${plan.table.tableName}`,
      );
    }
  }
}

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
  get #tableName() {
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
  async migrate() {
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

  async #loadExistingColumns() {
    const columns = await this.db.getTableColumns(this.#tableName);
    for (const column of columns) {
      this.existingColumns.set(column.columnName, column);
    }
  }
  async #loadExistingConstraints() {
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
  #loadTargetColumns() {
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

  #checkForColumnsToDrop() {
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
  #checkForColumnsToCreate() {
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
  async #checkTableInfo() {
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

  #checkForColumnsToModify() {
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

function compareDataTypes(
  existing: PostgresColumn,
  newColumn: PgColumnDefinition,
) {
  const properties: Array<keyof PgDataTypeDefinition> = [
    "dataType",
    "characterMaximumLength",
    "characterOctetLength",
    "numericPrecision",
    "numericPrecisionRadix",
    "numericScale",
    "datetimePrecision",
    "intervalType",
    "intervalPrecision",
  ];
  const from: Record<string, any> = {};
  const to: Record<string, any> = {};
  let hasChanges = false;
  for (const property of properties) {
    if (property in newColumn && existing[property] !== newColumn[property]) {
      hasChanges = true;
      from[property] = existing[property];
      to[property] = newColumn[property];
    }
  }

  if (!hasChanges) {
    return;
  }
  return {
    from: from as PgDataTypeDefinition,
    to: to as PgDataTypeDefinition,
  };
}
function compareNullable(
  existing: PostgresColumn,
  newColumn: PgColumnDefinition,
) {
  if (existing.isNullable === newColumn.isNullable) {
    return;
  }

  return {
    from: existing.isNullable,
    to: newColumn.isNullable,
  };
}
