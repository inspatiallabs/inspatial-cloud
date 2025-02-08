import { EntryType } from "#/entry/entry-type.ts";
import { InSpatialDB } from "#db/inspatial-db.ts";

export class Entry<ET extends EntryType = EntryType> {
  #db: InSpatialDB;
  #entryType!: ET;
  #data: Map<string, any>;
  static async load(id: any, db: InSpatialDB) {
    const entry = new Entry(db);
    const row = await entry.#db.getRow(entry.#entryType.config.tableName, id);
  }

  private constructor(db: InSpatialDB) {
    this.#db = db;
    this.#data = new Map();
  }
}
