import { InSpatialDB } from "#db";
import { ListOptions } from "#/types.ts";
import { FieldDefType } from "#/field/types.ts";
import { ORMField } from "#/field/orm-field.ts";
import { ormFields } from "#/field/fields.ts";
import { migrateEntryType } from "#/migrate/migrate-db.ts";
import { EntryType } from "#/entry/entry-type.ts";
import { serveLogger } from "../../serve/src/logger/serve-logger.ts";
import { SettingsType } from "#/settings/settings-type.ts";
import { raiseORMException } from "#/orm-exception.ts";
import { ormLogger } from "#/logger.ts";

export class InSpatialOrm {
  db: InSpatialDB;
  fieldTypes: Map<FieldDefType, ORMField>;
  entryTypes: Map<string, EntryType>;
  settingsTypes: Map<string, SettingsType>;
  constructor(
    /**
     * A configuration object that will be used to initialize the InSpatial ORM.
     */
    config: {
      /**
       * A list of EntryTypes that will be used to define the structure of the database.
       */
      entries: Array<EntryType>;
      /**
       * An instance of the InSpatialDB class that will be used to interact with the database.
       */
      db: InSpatialDB;
      /**
       * A list of SettingsTypes that will be used to define the structure of the settings
       */
      settings: Array<SettingsType>;
    },
  ) {
    this.fieldTypes = new Map();
    for (const field of ormFields) {
      this.fieldTypes.set(field.type, field as ORMField);
    }
    this.db = config.db;
    this.entryTypes = new Map();
    this.settingsTypes = new Map();
    for (const entryType of config.entries) {
      this.#addEntryType(entryType);
    }
    for (const settingsType of config.settings) {
      this.#addSettingsType(settingsType);
    }
  }

  #addEntryType(entryType: EntryType) {
    if (this.entryTypes.has(entryType.name)) {
      raiseORMException(
        `EntryType with name ${entryType.name} already exists.`,
      );
    }
    this.entryTypes.set(entryType.name, entryType);
  }

  #addSettingsType(settingsType: SettingsType) {
    if (this.settingsTypes.has(settingsType.name)) {
      raiseORMException(
        `SettingsType with name ${settingsType.name} already exists.`,
      );
    }
    this.settingsTypes.set(settingsType.name, settingsType);
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

  async migrate() {
    serveLogger.info(`Migrating database...`);
    for (const entryType of this.entryTypes.values()) {
      await migrateEntryType(entryType, this, (message) => {
        ormLogger.info(message);
      });
    }
    return {
      success: true,
    };
  }
}
