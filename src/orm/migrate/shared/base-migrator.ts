import type { InSpatialORM } from "#/orm/inspatial-orm.ts";
import type { InSpatialDB } from "#/orm/db/inspatial-db.ts";
import type { SettingsType } from "#/orm/settings/settings-type.ts";
import type { EntryType } from "#/orm/entry/entry-type.ts";
import type { ChildEntryType } from "@inspatial/cloud";
import type { EntryMigrationPlan } from "#/orm/migrate/entry-type/entry-migration-plan.ts";
import { EntryTypeMigrator } from "#/orm/migrate/entry-type/entry-type-migrator.ts";
import type { SettingsMigrationPlan } from "#/orm/migrate/settings-type/settings-migration-plan.ts";
import convertString from "#/utils/convert-string.ts";

export class BaseMigrator<T extends EntryType | SettingsType | ChildEntryType> {
  orm: InSpatialORM;
  db: InSpatialDB;
  log: (message: string) => void;
  typeDef: SettingsType | EntryType | ChildEntryType;
  migrationPlan!: T extends SettingsType ? SettingsMigrationPlan
    : EntryMigrationPlan;

  existingChildren: Map<string, any>;
  constructor(args: {
    orm: InSpatialORM;
    onOutput: (message: string) => void;
    typeDef: EntryType | SettingsType;
  }) {
    const { orm, onOutput } = args;
    this.orm = orm;
    this.db = orm.db;
    this.log = onOutput;
    this.typeDef = args.typeDef;
    this.existingChildren = new Map();
  }
  async loadExistingChildren(): Promise<void> {
    const result = await this.db.getRows<{ tableName: string }>("tables", {
      columns: ["tableName"],
      filter: [{
        field: "tableSchema",
        op: "=",
        value: this.db.schema,
      }, {
        field: "tableName",
        op: "startsWith",
        value: convertString(`child_${this.typeDef.name}`, "snake", true),
      }],
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
  async makeChildrenMigrationPlan(): Promise<void> {
    if (!this.typeDef.children) {
      return;
    }
    for (const child of this.typeDef.children.values()) {
      const migrationPlan = await this.generateChildMigrationPlan(child);
      this.migrationPlan.children.push(migrationPlan);
    }
  }
  async generateChildMigrationPlan(
    child: ChildEntryType<any>,
  ): Promise<EntryMigrationPlan> {
    const migrationPlan = new EntryTypeMigrator({
      entryType: child,
      orm: this.orm,
      onOutput: this.log,
      isChild: true,
    });

    return await migrationPlan.planMigration();
  }
}
