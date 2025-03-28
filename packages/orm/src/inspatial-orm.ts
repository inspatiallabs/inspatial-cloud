import type { InSpatialDB } from "#db";
import type { FieldDefType } from "#/field/field-def-types.ts";
import type { ORMField } from "#/field/orm-field.ts";
import { ormFields } from "#/field/fields.ts";
import type { EntryType } from "#/entry/entry-type.ts";
import type { SettingsType } from "#/settings/settings-type.ts";
import { raiseORMException } from "#/orm-exception.ts";
import { ormLogger } from "#/logger.ts";
import { buildEntry } from "#/entry/build-entry.ts";
import type { Entry } from "#/entry/entry.ts";
import type { DBListOptions, ListOptions } from "#db/types.ts";
import type { GlobalEntryHooks } from "#/types.ts";
import { generateEntryInterface } from "#/entry/generate-entry-interface.ts";
import { validateEntryType } from "./setup/entry-type/validate-entry-type.ts";
import { buildEntryType } from "./setup/entry-type/build-entry-types.ts";
import type { Settings } from "#/settings/settings.ts";
import { buildSettingsType } from "./setup/settings-type/build-settings-types.ts";
import { MigrationPlanner } from "#/migrate/migration-planner.ts";
import type { MigrationPlan } from "#/migrate/migration-plan.ts";
import { buildSettings } from "#/settings/build-settings.ts";

export class InSpatialORM {
  db: InSpatialDB;
  fieldTypes: Map<FieldDefType, ORMField<any>>;
  entryTypes: Map<string, EntryType>;
  #entryClasses: Map<string, typeof Entry>;
  settingsTypes: Map<string, SettingsType>;
  #settingsClasses: Map<string, typeof Settings>;
  #globalEntryHooks: GlobalEntryHooks = {
    beforeValidate: [],
    validate: [],
    beforeCreate: [],
    afterCreate: [],
    beforeUpdate: [],
    afterUpdate: [],
    beforeDelete: [],
    afterDelete: [],
  };

  #rootPath: string;
  get #entriesPath(): string {
    return `${this.#rootPath}/_generated/entries`;
  }
  async _runGlobalHooks(
    hookType: keyof GlobalEntryHooks,
    entry: Entry,
  ): Promise<void> {
    for (const hook of this.#globalEntryHooks[hookType]) {
      await hook({
        entryType: entry._name,
        entry,
        orm: this,
      });
    }
  }
  _getFieldType<T extends FieldDefType = FieldDefType>(
    fieldType: T,
  ): ORMField<T> {
    const fieldTypeDef = this.fieldTypes.get(fieldType);
    if (!fieldTypeDef) {
      raiseORMException(
        `Field type ${fieldType} does not exist in ORM`,
        "ORMField",
        400,
      );
    }
    return fieldTypeDef;
  }
  getEntryType<T extends EntryType = EntryType>(entryType: string): T {
    if (!this.entryTypes.has(entryType)) {
      raiseORMException(
        `EntryType ${entryType} does not exist in ORM`,
        "EntryType",
        400,
      );
    }
    return this.entryTypes.get(entryType)! as T;
  }

  getSettingsType<T extends SettingsType = SettingsType>(
    settingsType: string,
  ): T {
    if (!this.settingsTypes.has(settingsType)) {
      raiseORMException(`SettingsType ${settingsType} does not exist in ORM`);
    }
    return this.settingsTypes.get(settingsType)! as T;
  }
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

      /**
       * The root path of the application. This is used to determine the location for the generated files.
       * If not provided, the current working directory will be used.
       */
      rootPath?: string;

      globalEntryHooks?: GlobalEntryHooks;
    },
  ) {
    this.#rootPath = config.rootPath || Deno.cwd();
    this.#rootPath = `${this.#rootPath}/.inspatial`;

    this.fieldTypes = new Map();
    for (const field of ormFields) {
      this.fieldTypes.set(field.type, field as ORMField);
    }
    this.db = config.db;
    this.entryTypes = new Map();
    this.#entryClasses = new Map();
    this.settingsTypes = new Map();
    this.#settingsClasses = new Map();
    for (const entryType of config.entries) {
      this.#addEntryType(entryType);
    }
    for (const settingsType of config.settings) {
      this.#addSettingsType(settingsType);
    }
    if (config.globalEntryHooks) {
      this.#setupHooks(config.globalEntryHooks);
    }
    this.#setupEntryTypes();
    this.#setupSettingsTypes();
    this.#build();
  }

  #build(): void {
    for (const entryType of this.entryTypes.values()) {
      const entryClass = buildEntry(entryType);
      this.#entryClasses.set(entryType.name, entryClass);
    }
    for (const settingsType of this.settingsTypes.values()) {
      const settingsClass = buildSettings(settingsType);
      this.#settingsClasses.set(settingsType.name, settingsClass);
    }
  }

  #setupHooks(globalHooks: GlobalEntryHooks): void {
    this.#globalEntryHooks.validate.push(...globalHooks.validate);
    this.#globalEntryHooks.beforeValidate.push(
      ...globalHooks.beforeValidate,
    );
    this.#globalEntryHooks.beforeCreate.push(
      ...globalHooks.beforeCreate,
    );
    this.#globalEntryHooks.afterCreate.push(
      ...globalHooks.afterCreate,
    );
    this.#globalEntryHooks.beforeUpdate.push(
      ...globalHooks.beforeUpdate,
    );
    this.#globalEntryHooks.afterUpdate.push(
      ...globalHooks.afterUpdate,
    );
    this.#globalEntryHooks.beforeDelete.push(
      ...globalHooks.beforeDelete,
    );
    this.#globalEntryHooks.afterDelete.push(
      ...globalHooks.afterDelete,
    );
  }

  #addEntryType(entryType: EntryType): void {
    if (this.entryTypes.has(entryType.name)) {
      raiseORMException(
        `EntryType with name ${entryType.name} already exists.`,
      );
    }
    this.entryTypes.set(entryType.name, entryType);
  }
  #setupEntryTypes(): void {
    for (const entryType of this.entryTypes.values()) {
      buildEntryType(this, entryType);
    }
    for (const entryType of this.entryTypes.values()) {
      validateEntryType(this, entryType);
    }
  }
  #addSettingsType(settingsType: SettingsType): void {
    if (this.settingsTypes.has(settingsType.name)) {
      raiseORMException(
        `SettingsType with name ${settingsType.name} already exists.`,
      );
    }
    this.settingsTypes.set(settingsType.name, settingsType);
  }
  #setupSettingsTypes(): void {
    for (const settingsType of this.settingsTypes.values()) {
      buildSettingsType(this, settingsType);
    }
  }
  #getEntryInstance(entryType: string): Entry {
    const entryClass = this.#entryClasses.get(entryType);
    if (!entryClass) {
      raiseORMException(
        `EntryType ${entryType} is not a valid entry type.`,
      );
    }
    return new entryClass(this, entryType);
  }

  #getSettingsInstance(settingsType: string): Settings {
    const settingsClass = this.#settingsClasses.get(settingsType);
    if (!settingsClass) {
      raiseORMException(
        `SettingsType ${settingsType} is not a valid settings type.`,
      );
    }
    return new settingsClass(this, settingsType);
  }

  // Single Entry Operations
  /**
   * Creates a new entry in the database with the provided data.
   */
  async createEntry<E extends string>(
    entryType: E,
    data: Record<string, any>,
  ): Promise<Entry> {
    const entry = this.#getEntryInstance(entryType);
    entry.create();
    entry.update(data);
    await entry.save();
    return entry;
  }
  /**
   * Gets an instance of a new entry with default values set. This is not saved to the database.
   */
  getNewEntry<E extends string>(entryType: E): Entry {
    const entry = this.#getEntryInstance(entryType);
    entry.create();
    return entry;
  }
  /**
   * Gets an entry from the database by its ID.
   */
  async getEntry<E extends string>(entryType: E, id: string): Promise<Entry> {
    const entry = this.#getEntryInstance(entryType);
    await entry.load(id);
    return entry;
  }
  /**
   * Updates an entry in the database with the provided data.
   * The data object should contain the fields that need to be updated with their new values.
   */
  async updateEntry<E extends string>(
    entryType: E,
    id: any,
    data: Record<string, any>,
  ): Promise<any> {
    const entry = await this.getEntry(entryType, id);
    entry.update(data);
    await entry.save();
  }

  /**
   * Deletes an entry from the database.
   */
  async deleteEntry<E extends string>(entryType: E, id: string): Promise<any> {
    const entry = await this.getEntry(entryType, id);
    await entry.delete();
    return entry;
  }

  // Multiple Entry Operations

  /**
   * Gets a list of entries for a specific EntryType.
   */
  async getEntryList<E extends string>(
    entryType: E,
    options?: ListOptions,
  ): Promise<any> {
    const entryTypeObj = this.getEntryType(entryType);
    const tableName = entryTypeObj.config.tableName;
    let dbOptions: DBListOptions = {
      limit: 100,
      columns: Array.from(entryTypeObj.defaultListFields),
    };
    if (options?.columns && Array.isArray(options.columns)) {
      const columns: string[] = [];
      options.columns.forEach((column) => {
        const field = entryTypeObj.fields.get(column);
        if (!field) {
          raiseORMException(
            `Field with key ${column} does not exist in EntryType ${entryType}`,
          );
        }
        if (field.hidden) {
          raiseORMException(
            `Field with key ${column} is hidden in EntryType ${entryType}`,
          );
        }
        columns.push(column);
      });
      if (columns.length > 0) {
        dbOptions.columns = columns;
      }
    }
    if (options) {
      delete options.columns;
      dbOptions = { ...dbOptions, ...options };
    }
    const result = await this.db.getRows(tableName, dbOptions);
    return result;
  }

  // Special Operations

  /**
   * Gets the value of a specific field in an entry.
   */
  async getEntryValue<E extends string>(
    entryType: E,
    id: string,
    field: string,
  ): Promise<any> {
    raiseORMException(
      `getEntryValue is not implemented yet. Use getEntry instead.`,
      "ORMField",
      501,
    );
  }

  // Settings

  /**
   * Gets the settings for a specific settings type.
   */
  async getSettings<S extends string>(settingsType: S): Promise<any> {
    const settings = this.#getSettingsInstance(settingsType);
    await settings.load();
    return settings;
  }
  /**
   * Updates the settings for a specific settings type.
   */
  async updateSettings<S extends string>(
    settingsType: S,
    data: Record<string, any>,
  ): Promise<any> {}

  /**
   * Gets the value of a specific setting field.
   */
  async getSettingsValue<S extends string>(
    settingsType: S,
    field: string,
  ): Promise<any> {
  }

  /**
   * Makes the necessary changes to the database based on the output of the planMigration method.
   */
  async migrate(): Promise<Array<string>> {
    const migrationPlanner = new MigrationPlanner({
      entryTypes: Array.from(this.entryTypes.values()),
      settingsTypes: Array.from(this.settingsTypes.values()),
      orm: this,
      onOutput: (message) => {
        ormLogger.info(message);
      },
    });
    return await migrationPlanner.migrate();
  }

  /**
   * Plans a migration for the ORM. This will return the details of the changes that will be made to the database.
   * This method does not make any changes to the database.
   */
  async planMigration(): Promise<MigrationPlan> {
    ormLogger.info("Planning migration...");
    const migrationPlanner = new MigrationPlanner({
      entryTypes: Array.from(this.entryTypes.values()),
      settingsTypes: Array.from(this.settingsTypes.values()),
      orm: this,
      onOutput: (message) => {
        ormLogger.info(message);
      },
    });
    return await migrationPlanner.createMigrationPlan();
  }
  /**
   * Generates TypeScript interfaces for all EntryTypes in the ORM.
   * The generated interfaces will be saved in the `.inspatial/_generated/entries` directory in the root path of the application.
   */
  generateInterfaces(): { generatedEntries: string[] } {
    const generatedEntries: string[] = [];
    for (const entryType of this.entryTypes.values()) {
      generateEntryInterface(this, entryType, this.#entriesPath);
      generatedEntries.push(entryType.name);
    }
    return {
      generatedEntries,
    };
  }
}
