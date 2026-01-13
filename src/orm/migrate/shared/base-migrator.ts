import type { InSpatialORM } from "~/orm/inspatial-orm.ts";
import type { InSpatialDB } from "~/orm/db/inspatial-db.ts";
import type { SettingsType } from "~/orm/settings/settings-type.ts";
import type { EntryType } from "~/orm/entry/entry-type.ts";
import type { ChildEntryType } from "@inspatial/cloud";
import type { EntryMigrationPlan } from "~/orm/migrate/entry-type/entry-migration-plan.ts";
import { EntryTypeMigrator } from "~/orm/migrate/entry-type/entry-type-migrator.ts";
import type { SettingsMigrationPlan } from "~/orm/migrate/settings-type/settings-migration-plan.ts";
import convertString from "~/utils/convert-string.ts";
import type {
  PostgresColumn,
  TableConstraint,
  TableIndex,
} from "../../db/db-types.ts";

export class BaseMigrator<T extends EntryType | SettingsType | ChildEntryType> {
  db: InSpatialDB;
  orm: InSpatialORM;
  log: (message: string) => void;
  typeDef: SettingsType | EntryType | ChildEntryType;
  migrationPlan!: T extends SettingsType ? SettingsMigrationPlan
    : EntryMigrationPlan;

  existingChildren: Map<
    string,
    { tableName: string; columns: Array<PostgresColumn> }
  >;
  constructor(args: {
    db: InSpatialDB;
    orm: InSpatialORM;
    onOutput: (message: string) => void;
    typeDef: EntryType | SettingsType;
  }) {
    const { db, orm, onOutput } = args;

    this.db = db;
    this.log = onOutput;
    this.orm = orm;
    this.typeDef = args.typeDef;
    this.existingChildren = new Map();
  }
  loadExistingChildren(columns: Array<PostgresColumn>): void {
    const snakeTable = convertString(
      `child_${this.typeDef.name}`,
      "snake",
      true,
    );
    const childrenColumns = columns.filter((column) =>
      column.tableName.startsWith(snakeTable)
    );
    for (const column of childrenColumns) {
      const tableName = convertString(column.tableName, "camel");
      if (!this.existingChildren.has(tableName)) {
        this.existingChildren.set(tableName, {
          tableName,
          columns: [],
        });
      }
      this.existingChildren.get(tableName)!.columns.push(column);
    }
  }
  async makeChildrenMigrationPlan(options: {
    indexes: Array<TableIndex>;
    columns: Array<PostgresColumn>;
    constraints: Array<TableConstraint>;
    tables: Set<string>;
  }): Promise<void> {
    if (!this.typeDef.children) {
      return;
    }
    const { columns } = options;
    for (const child of this.typeDef.children.values()) {
      const migrationPlan = await this.generateChildMigrationPlan(
        child,
        options,
      );
      this.migrationPlan.children.push(migrationPlan);
    }
  }
  async generateChildMigrationPlan(
    child: ChildEntryType<any>,
    options: {
      columns: Array<PostgresColumn>;
      indexes: Array<TableIndex>;
      constraints: Array<TableConstraint>;
      tables: Set<string>;
    },
  ): Promise<EntryMigrationPlan> {
    const migrationPlan = new EntryTypeMigrator({
      entryType: child,
      db: this.db,
      orm: this.orm,
      onOutput: this.log,
      isChild: true,
    });

    return await migrationPlan.planMigration(options);
  }
}
