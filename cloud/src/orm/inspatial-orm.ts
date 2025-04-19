import { InSpatialDB } from "#/orm/db/inspatial-db.ts";
import type { FieldDefType } from "#/orm/field/field-def-types.ts";
import type { ORMField } from "#/orm/field/orm-field.ts";
import type { EntryType } from "#/orm/entry/entry-type.ts";
import type { SettingsType } from "#/orm/settings/settings-type.ts";
import type { Settings } from "#/orm/settings/settings.ts";
import type { GetListResponse, GlobalEntryHooks } from "#/orm/orm-types.ts";
import type { Entry } from "#/orm/entry/entry.ts";
import { raiseORMException } from "#/orm/orm-exception.ts";
import { buildEntry } from "#/orm/entry/build-entry.ts";
import { buildSettings } from "#/orm/settings/build-settings.ts";
import { buildEntryType } from "#/orm/setup/entry-type/build-entry-types.ts";
import { validateEntryType } from "#/orm/setup/entry-type/validate-entry-type.ts";
import { buildSettingsType } from "#/orm/setup/settings-type/build-settings-types.ts";
import { EntryBase, GenericEntry } from "#/orm/entry/entry-base.ts";
import {
  DBConfig,
  DBFilter,
  DBListOptions,
  ListOptions,
} from "#/orm/db/db-types.ts";
import { GenericSettings, SettingsBase } from "#/orm/settings/settings-base.ts";
import { MigrationPlanner } from "#/orm/migrate/migration-planner.ts";
import { ormLogger } from "#/orm/logger.ts";
import { MigrationPlan } from "#/orm/migrate/migration-plan.ts";
import {
  generateEntryInterface,
  generateSettingsInterfaces,
} from "#/orm/build/generate-interface/generate-interface.ts";
import { ormFields } from "#/orm/field/fields.ts";

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
  /**
   * The root path of the generated files for the ORM.
   */
  get generatedRoot(): string {
    return `${this.#rootPath}/_generated`;
  }
  #rootPath: string;
  get #entriesPath(): string {
    return `${this.#rootPath}/_generated/entries`;
  }
  get #settingsPath(): string {
    return `${this.#rootPath}/_generated/settings`;
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
  getEntryType<T extends EntryType = EntryType>(
    entryType: string,
    user?: any,
  ): T {
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
    user?: any,
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
    options: {
      /**
       * A list of EntryTypes that will be used to define the structure of the database.
       */
      entries: Array<EntryType>;
      /**
       * An instance of the InSpatialDB class that will be used to interact with the database.
       */
      db?: InSpatialDB;
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
      dbConfig: DBConfig;
    },
  ) {
    this.#rootPath = options.rootPath || Deno.cwd();
    this.#rootPath = `${this.#rootPath}/.inspatial`;

    this.fieldTypes = new Map();
    for (const field of ormFields) {
      this.fieldTypes.set(field.type, field as ORMField);
    }
    this.db = options.db || new InSpatialDB(options.dbConfig);
    this.entryTypes = new Map();
    this.#entryClasses = new Map();
    this.settingsTypes = new Map();
    this.#settingsClasses = new Map();
    for (const entryType of options.entries) {
      this.#addEntryType(entryType);
    }
    for (const settingsType of options.settings) {
      this.#addSettingsType(settingsType);
    }
    if (options.globalEntryHooks) {
      this.#setupHooks(options.globalEntryHooks);
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
  #getEntryInstance(entryType: string, user?: any): Entry {
    const entryClass = this.#entryClasses.get(entryType);
    if (!entryClass) {
      raiseORMException(
        `EntryType ${entryType} is not a valid entry type.`,
      );
    }
    return new entryClass(this, entryType, user);
  }

  #getSettingsInstance(settingsType: string, user?: any): Settings {
    const settingsClass = this.#settingsClasses.get(settingsType);
    if (!settingsClass) {
      raiseORMException(
        `SettingsType ${settingsType} is not a valid settings type.`,
      );
    }
    return new settingsClass(this, settingsType, user);
  }

  // Single Entry Operations
  /**
   * Creates a new entry in the database with the provided data.
   */
  async createEntry<E extends EntryBase = GenericEntry>(
    entryType: string,
    data: Record<string, any>,
    user?: any,
  ): Promise<E> {
    const entry = this.#getEntryInstance(entryType, user) as E;
    entry.create();
    entry.update(data);
    await entry.save();
    return entry;
  }
  /**
   * Gets an instance of a new entry with default values set. This is not saved to the database.
   */
  getNewEntry<E extends EntryBase = GenericEntry>(
    entryType: string,
    user?: any,
  ): E {
    const entry = this.#getEntryInstance(entryType, user) as E;
    entry.create();
    return entry;
  }
  /**
   * Gets an entry from the database by its ID.
   */
  async getEntry<E extends EntryBase = GenericEntry>(
    entryType: string,
    id: string,
    user?: any,
  ): Promise<E> {
    const entry = this.#getEntryInstance(entryType, user) as E;
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
    user?: any,
  ): Promise<any> {
    const entry = await this.getEntry(entryType, id, user);
    entry.update(data);
    await entry.save();
  }

  /**
   * Deletes an entry from the database.
   */
  async deleteEntry<E extends string>(
    entryType: E,
    id: string,
    user?: any,
  ): Promise<any> {
    const entry = await this.getEntry(entryType, id, user);
    await entry.delete();
    return entry;
  }

  async findEntry<E extends EntryBase = GenericEntry>(
    entryType: string,
    filter: DBFilter,
    user?: any,
  ): Promise<E | null> {
    const entryTypeObj = this.getEntryType(entryType, user);
    const tableName = entryTypeObj.config.tableName;
    const result = await this.db.getRows(tableName, {
      filter,
      limit: 1,
      columns: ["id"],
    });
    if (result.rowCount === 0) {
      return null;
    }
    const entry = await this.getEntry<E>(entryType, result.rows[0].id, user);
    return entry;
  }

  // Multiple Entry Operations

  /**
   * Gets a list of entries for a specific EntryType.
   */
  async getEntryList<E extends string>(
    entryType: E,
    options?: ListOptions,
    user?: any,
  ): Promise<GetListResponse<E>> {
    const entryTypeObj = this.getEntryType(entryType, user);
    const tableName = entryTypeObj.config.tableName;
    let dbOptions: DBListOptions = {
      limit: 100,
      columns: [],
    };
    const dbColumns = new Set(entryTypeObj.defaultListFields);
    const titleColumns = new Set();
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
        dbColumns.clear();
        for (const column of columns) {
          dbColumns.add(column);
        }
      }
    }
    for (const item of dbColumns) {
      const titleField = entryTypeObj.connectionTitleFields.get(item);
      if (titleField) {
        titleColumns.add(titleField.key);
      }
    }
    dbOptions.columns = [
      ...Array.from(dbColumns) as string[],
      ...Array.from(titleColumns) as string[],
    ];

    if (options) {
      delete options.columns;
      dbOptions = { ...dbOptions, ...options };
    }
    const result = await this.db.getRows(tableName, dbOptions);
    return result as GetListResponse<E>;
  }

  async count(
    entryType: string,
    filter?: DBFilter,
    groupBy?: Array<string>,
    user?: any,
  ): Promise<number> {
    ormLogger.warn(
      "count is not fully implemented. Check source",
    );
    const entryTypeObj = this.getEntryType(entryType, user);
    const tableName = entryTypeObj.config.tableName;
    const result = await this.db.count(tableName, {
      filter,
      groupBy,
    });
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
    user?: any,
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
  async getSettings<T extends SettingsBase = GenericSettings>(
    settingsType: string,
    user?: any,
  ): Promise<T> {
    const settings = this.#getSettingsInstance(settingsType, user) as T;
    await settings.load();
    return settings;
  }
  /**
   * Updates the settings for a specific settings type.
   */
  async updateSettings<
    T extends SettingsBase = GenericSettings,
  >(
    settingsType: string,
    data: Record<string, any>,
    user?: any,
  ): Promise<T> {
    const settings = this.#getSettingsInstance(settingsType, user) as T;
    settings.update(data);
    await settings.save();
    return settings;
  }

  /**
   * Gets the value of a specific setting field.
   */
  async getSettingsValue<S extends string>(
    settingsType: S,
    field: string,
    user?: any,
  ): Promise<any> {
    const settings = this.#getSettingsInstance(settingsType, user);
    return await settings.getValue(field);
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
  async generateInterfaces(): Promise<
    { generatedEntries: string[]; generatedSettings: string[] }
  > {
    const generatedEntries: string[] = [];
    const generatedSettings: string[] = [];
    for (const entryType of this.entryTypes.values()) {
      await generateEntryInterface(this, entryType, this.#entriesPath);
      generatedEntries.push(entryType.name);
    }
    for (const settingsType of this.settingsTypes.values()) {
      await generateSettingsInterfaces(this, settingsType, this.#settingsPath);
      generatedSettings.push(settingsType.name);
    }
    return {
      generatedEntries,
      generatedSettings,
    };
  }
}
