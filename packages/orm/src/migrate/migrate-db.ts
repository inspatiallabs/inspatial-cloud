import { EntryType } from "#/entry/entry-type.ts";
import { InSpatialOrm } from "#/inspatial-orm.ts";
import { InSpatialDB } from "#db";
import { PostgresColumn } from "#db/types.ts";

export async function migrateEntryType(
  entryType: EntryType,
  orm: InSpatialOrm,
  onOutput: (message: string) => void,
) {
  const migrator = new EntryTypeMigrator({ entryType, orm, onOutput });
  await migrator.migrate();
}

class EntryTypeMigrator {
  entryType: EntryType;
  orm: InSpatialOrm;
  log: (message: string) => void;
  db: InSpatialDB;
  existingColumns: Array<PostgresColumn>;
  get #tableName() {
    return this.entryType.config.tableName;
  }
  constructor(
    config: {
      entryType: EntryType;
      orm: InSpatialOrm;
      onOutput: (message: string) => void;
    },
  ) {
    const { entryType, orm, onOutput } = config;
    this.log = onOutput;
    this.entryType = entryType;
    this.orm = orm;
    this.db = orm.db;
    this.existingColumns = [];
  }
  async migrate() {
    const created = await this.#validateTable();
    switch (created) {
      case true:
        this.log(`Created table ${this.#tableName}`);
        break;
      case false:
        this.log(`Table ${this.#tableName} already exists`);
        break;
    }
    this.log(`Migrating columns for table ${this.#tableName}`);
    await this.#loadExistingColumns();
    this.log(
      `Existing columns: ${
        this.existingColumns.map((c) => c.columnName).join(", ")
      }`,
    );
  }

  async planMigration() {
  }

  async #validateTable() {
    const tableExists = await this.db.tableExists(this.#tableName);
    if (!tableExists) {
      await this.db.createTable(this.#tableName);
      return true;
    }
    return false;
  }

  async #loadExistingColumns() {
    this.existingColumns = await this.db.getTableColumns(this.#tableName);
  }
}
