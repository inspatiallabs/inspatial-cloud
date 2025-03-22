import { InSpatialDB } from "#db";
import { FieldDefType } from "#/field/field-def-types.ts";
import { ORMField } from "#/field/orm-field.ts";
import { ormFields } from "#/field/fields.ts";
import { EntryMigrationPlan, MigrationPlanner } from "#/migrate/migrate-db.ts";
import { EntryType } from "#/entry/entry-type.ts";
import { SettingsType } from "#/settings/settings-type.ts";
import { raiseORMException } from "#/orm-exception.ts";
import { ormLogger } from "#/logger.ts";
import { buildEntry } from "#/entry/build-entry.ts";
import { Entry } from "#/entry/entry.ts";
import { DBListOptions, ListOptions } from "#db/types.ts";
import { GlobalEntryHooks } from "#/types.ts";
import { generateEntryInterface } from "#/entry/generate-entry-interface.ts";
import { validateEntryType } from "#/setup/validate-entry-type.ts";
import { buildEntryType } from "#/setup/build-entry-types.ts";

export class InSpatialORM {
  db: InSpatialDB;
  fieldTypes: Map<FieldDefType, ORMField<any>>;
  entryTypes: Map<string, EntryType>;
  #entryClasses: Map<string, typeof Entry>;
  settingsTypes: Map<string, SettingsType>;
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
  get #entriesPath() {
    return `${this.#rootPath}/_generated/entries`;
  }
  async _runGlobalHooks(hookType: keyof GlobalEntryHooks, entry: Entry) {
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
      );
    }
    return fieldTypeDef;
  }
  getEntryType<T extends EntryType = EntryType>(entryType: string): T {
    if (!this.entryTypes.has(entryType)) {
      raiseORMException(`EntryType ${entryType} does not exist in ORM`);
    }
    return this.entryTypes.get(entryType)! as T;
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
    this.#build();
  }

  #build() {
    for (const entryType of this.entryTypes.values()) {
      const entryClass = buildEntry(entryType);
      this.#entryClasses.set(entryType.name, entryClass);
    }
  }

  #setupHooks(globalHooks: GlobalEntryHooks) {
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
  #setupEntryTypes() {
    for (const entryType of this.entryTypes.values()) {
      buildEntryType(this, entryType);
    }
    for (const entryType of this.entryTypes.values()) {
      validateEntryType(this, entryType);
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
  #getEntryInstance(entryType: string) {
    const entryClass = this.#entryClasses.get(entryType);
    if (!entryClass) {
      raiseORMException(
        `EntryType ${entryType} is not a valid entry type.`,
      );
    }
    return new entryClass(this, entryType);
  }

  // Single Entry Operations
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

  async getNewEntry<E extends string>(entryType: E): Promise<Entry> {
    const entry = this.#getEntryInstance(entryType);
    entry.create();
    return entry;
  }
  async getEntry<E extends string>(entryType: E, id: string): Promise<Entry> {
    const entry = this.#getEntryInstance(entryType);
    await entry.load(id);
    return entry;
  }
  async updateEntry<E extends string>(
    entryType: E,
    id: any,
    data: Record<string, any>,
  ): Promise<any> {
    const entry = await this.getEntry(entryType, id);
    entry.update(data);
    await entry.save();
  }
  async deleteEntry<E extends string>(entryType: E, id: string): Promise<any> {
    const entry = await this.getEntry(entryType, id);
    await entry.delete();
    return entry;
  }

  // Multiple Entry Operations

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

  async migrate(): Promise<Array<string>> {
    const migrationPlanner = new MigrationPlanner(
      Array.from(this.entryTypes.values()),
      this,
      (message) => {
        ormLogger.info(message);
      },
    );
    return await migrationPlanner.migrate();
  }

  async planMigration(): Promise<Array<EntryMigrationPlan>> {
    const migrationPlanner = new MigrationPlanner(
      Array.from(this.entryTypes.values()),
      this,
      (message) => {
        ormLogger.info(message);
      },
    );
    return await migrationPlanner.createMigrationPlan();
  }
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
