import { InSpatialDB } from "#/orm/db/inspatial-db.ts";
import type { InFieldType } from "#/orm/field/field-def-types.ts";
import type { ORMFieldConfig } from "#/orm/field/orm-field.ts";
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
import type { EntryBase, GenericEntry } from "#/orm/entry/entry-base.ts";
import type {
  DBConfig,
  DBFilter,
  DBListOptions,
  ListOptions,
} from "#/orm/db/db-types.ts";
import type {
  GenericSettings,
  SettingsBase,
} from "#/orm/settings/settings-base.ts";
import { MigrationPlanner } from "#/orm/migrate/migration-planner.ts";
import type { MigrationPlan } from "#/orm/migrate/migration-plan.ts";
import {
  generateEntryInterface,
  generateSettingsInterfaces,
} from "#/orm/build/generate-interface/generate-interface.ts";
import { ormFields } from "#/orm/field/fields.ts";
import type { SessionData } from "#extensions/auth/types.ts";
import { inLog } from "#/in-log/in-log.ts";
import { ConnectionRegistry } from "#/orm/registry/connection-registry.ts";
import type { InValue } from "#/orm/field/types.ts";
import { registerFetchFields } from "#/orm/setup/setup-utils.ts";
import type { IDValue } from "./entry/types.ts";
import type { InCloud } from "#/inspatial-cloud.ts";

export class InSpatialORM {
  db: InSpatialDB;
  readonly inCloud: InCloud;
  fieldTypes: Map<InFieldType, ORMFieldConfig<any>>;
  entryTypes: Map<string, EntryType>;
  #entryClasses: Map<string, typeof Entry>;
  settingsTypes: Map<string, SettingsType>;
  #settingsClasses: Map<string, typeof Settings>;
  registry: ConnectionRegistry;
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
  _getFieldType<T extends InFieldType = InFieldType>(
    fieldType: T,
  ): ORMFieldConfig<T> {
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
    _user?: SessionData,
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
    _user?: SessionData,
  ): T {
    if (!this.settingsTypes.has(settingsType)) {
      raiseORMException(`SettingsType ${settingsType} does not exist in ORM`);
    }
    return this.settingsTypes.get(settingsType)! as T;
  }
  constructor(
    inCloud: InCloud,
    /**
     * A configuration object that will be used to initialize the InSpatial ORM.
     */
    options: {
      /**
       * A list of EntryTypes that will be used to define the structure of the database.
       */
      entries: Array<EntryType>;
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
    this.inCloud = inCloud;
    this.#rootPath = options.rootPath || Deno.cwd();
    this.#rootPath = `${this.#rootPath}/.inspatial`;
    this.registry = new ConnectionRegistry();

    this.fieldTypes = new Map();
    for (const field of ormFields) {
      this.fieldTypes.set(field.type, field as ORMFieldConfig);
    }
    this.db = new InSpatialDB({
      ...options.dbConfig,
    });
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
  async init(): Promise<void> {
    await this.db.init();

    // Check if the first run migration is needed
    const settings = await this.db.tableExists("inSettings");
    if (!settings) {
      await this.migrate();
    }
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
      registerFetchFields(this, entryType);
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
    return new entryClass(this, this.inCloud, entryType, user);
  }

  #getSettingsInstance(settingsType: string, user?: any): Settings {
    const settingsClass = this.#settingsClasses.get(settingsType);
    if (!settingsClass) {
      raiseORMException(
        `SettingsType ${settingsType} is not a valid settings type.`,
      );
    }
    return new settingsClass(this, this.inCloud, settingsType, user);
  }

  // Single Entry Operations
  /**
   * Creates a new entry in the database with the provided data.
   */
  async createEntry<E extends EntryBase = GenericEntry>(
    entryType: E["_name"],
    data: Record<string, any>,
    user?: SessionData,
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
    entryType: E["_name"],
    user?: SessionData,
  ): E {
    const entry = this.#getEntryInstance(entryType, user) as E;
    entry.create();
    return entry;
  }
  /**
   * Gets an entry from the database by its ID.
   */
  async getEntry<E extends EntryBase = GenericEntry>(
    entryType: E["_name"],
    id: IDValue,
    user?: SessionData,
  ): Promise<E> {
    const entry = this.#getEntryInstance(entryType, user) as E;
    await entry.load(id);
    return entry;
  }
  /**
   * Updates an entry in the database with the provided data.
   * The data object should contain the fields that need to be updated with their new values.
   */
  async updateEntry<E extends EntryBase = GenericEntry>(
    entryType: E["_name"],
    id: string,
    data: Record<string, any>,
    user?: SessionData,
  ): Promise<any> {
    const entry = await this.getEntry(entryType, id, user);
    entry.update(data);
    await entry.save();
  }

  /**
   * Deletes an entry from the database.
   */
  async deleteEntry<E extends EntryBase = GenericEntry>(
    entryType: E["_name"],
    id: string,
    user?: SessionData,
  ): Promise<any> {
    const entry = await this.getEntry(entryType, id, user);
    await entry.delete();
    return entry;
  }

  async findEntry<E extends EntryBase = GenericEntry>(
    entryType: E["_name"],
    filter: DBFilter,
    user?: SessionData,
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
  async findEntryId(
    entryType: string,
    filter: DBFilter,
    user?: SessionData,
  ): Promise<IDValue | null> {
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
    return result.rows[0].id;
  }
  // Multiple Entry Operations

  /**
   * Gets a list of entries for a specific EntryType.
   */
  async getEntryList<E extends EntryBase = GenericEntry>(
    entryType: E["_name"],
    options?: ListOptions<E>,
    user?: SessionData,
  ): Promise<GetListResponse<E>> {
    const entryTypeObj = this.getEntryType(entryType, user);
    const tableName = entryTypeObj.config.tableName;
    let dbOptions: DBListOptions = {
      limit: 100,
      columns: [],
    };
    const { defaultSortField, defaultSortDirection } = entryTypeObj;
    if (defaultSortField) {
      dbOptions.orderBy = defaultSortField as string;
    }
    if (defaultSortDirection) {
      dbOptions.order = defaultSortDirection;
    }
    const dbColumns = new Set(entryTypeObj.defaultListFields);
    const titleColumns = new Set();
    if (options?.columns && Array.isArray(options.columns)) {
      const columns: string[] = [];
      options.columns.forEach((col) => {
        const column = col as string;
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
      dbOptions = { ...dbOptions, ...options as any };
    }
    const result = await this.db.getRows(tableName, dbOptions);
    return result as GetListResponse<E>;
  }

  async count(
    entryType: string,
    filter?: DBFilter,
    groupBy?: Array<string>,
    user?: SessionData,
  ): Promise<number> {
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
  getEntryValue<E extends EntryBase = GenericEntry>(
    _entryType: E["_name"],
    _id: string,
    _field: string,
    _user?: SessionData,
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
    settingsType: T["_name"],
    user?: SessionData,
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
    settingsType: T["_name"],
    data: Record<string, any>,
    user?: SessionData,
  ): Promise<T> {
    const settings = await this.getSettings<T>(settingsType, user);
    settings.update(data);
    await settings.save();
    return settings;
  }

  /**
   * Gets the value of a specific setting field.
   */
  async getSettingsValue<
    T extends SettingsBase = GenericSettings,
  >(
    settingsType: T["_name"],
    field: string,
    user?: SessionData,
  ): Promise<any> {
    const settings = this.#getSettingsInstance(settingsType, user);
    return await settings.getValue(field);
  }

  async batchUpdateField(
    entryType: string,
    field: string,
    value: InValue,
    filters: DBFilter,
  ): Promise<void> {
    const entryTypeDef = this.getEntryType(entryType);
    if (!entryTypeDef.fields.has(field)) {
      raiseORMException(
        `EntryType ${entryType} doesn't have a field with key '${field}'`,
      );
    }
    const inField = entryTypeDef.fields.get(field)!;

    const fieldType = this._getFieldType(inField.type);
    value = fieldType.normalize(value, inField);
    if (!fieldType.validate(value, inField)) {
      raiseORMException("Value is not valid!");
    }
    value = fieldType.prepareForDB(value, inField);

    await this.db.batchUpdateColumn(
      entryTypeDef.config.tableName,
      field,
      value,
      filters,
    );
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
        inLog.info(message);
      },
    });
    return await migrationPlanner.migrate();
  }

  /**
   * Plans a migration for the ORM. This will return the details of the changes that will be made to the database.
   * This method does not make any changes to the database.
   */
  async planMigration(): Promise<MigrationPlan> {
    inLog.info("Planning migration...");
    const migrationPlanner = new MigrationPlanner({
      entryTypes: Array.from(this.entryTypes.values()),
      settingsTypes: Array.from(this.settingsTypes.values()),
      orm: this,
      onOutput: (message) => {
        inLog.info(message);
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
