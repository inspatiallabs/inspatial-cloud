import { InSpatialDB } from "#db";
import { DBConfig } from "#db/types.ts";
import { ListOptions } from "#/types.ts";
import { ORMFieldType } from "#/field/types.ts";
import { ORMField } from "#/field/orm-field.ts";
import { ormFields } from "#/field/fields.ts";

export class InSpatialOrm {
  db: InSpatialDB;

  constructor(config: {
    dbConfig: DBConfig;
  }) {
    this.db = new InSpatialDB(config.dbConfig);
  }

  // Single Entry Operations
  async createEntry<E extends string>(entryType: E, entry: any): Promise<any> {}
  async getEntry<E extends string>(entryType: E, id: string): Promise<any> {}
  async updateEntry<E extends string>(
    entryType: E,
    entry: any,
    data: Record<string, any>,
  ): Promise<any> {}
  async deleteEntry<E extends string>(entryType: E, id: string): Promise<any> {}

  // Multiple Entry Operations

  async getEntryList<E extends string>(
    entryType: E,
    options?: ListOptions,
  ): Promise<any> {}

  // Special Operations

  async getEntryValue<E extends string>(
    entryType: E,
    id: string,
    field: string,
  ): Promise<any> {}

  // Settings

  async getSettings<S extends string>(settingsType: S): Promise<any> {}

  async updateSettings<S extends string>(
    settingsType: S,
    data: Record<string, any>,
  ): Promise<any> {}

  async getSettingsValue<S extends string>(
    settingsType: S,
    field: string,
  ): Promise<any> {}
}
