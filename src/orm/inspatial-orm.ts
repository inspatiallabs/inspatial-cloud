import { InSpatialDB } from "~/orm/db/inspatial-db.ts";
import type { InFieldType } from "~/orm/field/field-def-types.ts";
import type { ORMFieldConfig } from "~/orm/field/orm-field.ts";
import type { EntryType } from "~/orm/entry/entry-type.ts";
import type { SettingsType } from "~/orm/settings/settings-type.ts";
import type { GetListResponse, GlobalEntryHooks } from "~/orm/orm-types.ts";
import type { Entry } from "~/orm/entry/entry.ts";
import { raiseORMException } from "~/orm/orm-exception.ts";

import type { EntryBase, GenericEntry } from "~/orm/entry/entry-base.ts";
import type {
  DBConfig,
  DBFilter,
  DBListOptions,
  ListOptions,
} from "~/orm/db/db-types.ts";
import type {
  GenericSettings,
  SettingsBase,
} from "~/orm/settings/settings-base.ts";
import { MigrationPlanner } from "~/orm/migrate/migration-planner.ts";
import type { MigrationPlan } from "~/orm/migrate/migration-plan.ts";
import {
  generateEntryInterface,
  generateSettingsInterfaces,
} from "~/orm/build/generate-interface/generate-interface.ts";
import { ormFields } from "~/orm/field/fields.ts";
import { inLog } from "#inLog";
import type { InValue } from "~/orm/field/types.ts";
import type { IDValue } from "./entry/types.ts";
import type { InCloud } from "../cloud/in-cloud.ts";
import type { RoleManager } from "./roles/role.ts";
import type { EntryTypeRegistry } from "./registry/connection-registry.ts";
import type { UserContext, UserID } from "../auth/types.ts";

export class InSpatialORM {
  db: InSpatialDB;
  systemDb: InSpatialDB;
  fieldTypes: Map<InFieldType, ORMFieldConfig<any>>;
  _inCloud: InCloud;
  _user: UserContext | undefined;
  systemAdminUser: UserID = {
    role: "systemAdmin",
    userId: "systemAdmin",
  };
  #roles: RoleManager;
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

  withUser(user: UserContext | undefined): InSpatialORM {
    if (!user) {
      raiseORMException(
        "User context is required to use withUser method",
        "ORMUserContext",
        400,
      );
    }
    const clone = Object.create(this);
    clone._user = user;
    clone.db = this.db.withSchema(user.accountId);
    return clone;
  }
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
      inCloud: InCloud;
    },
  ) {
    this.#rootPath = options.rootPath || Deno.cwd();
    this.#rootPath = `${this.#rootPath}/.inspatial`;
    this.#roles = options.inCloud.roles;
    const adminRole = this.#roles.getRole("systemAdmin");

    this._inCloud = options.inCloud;
    this.fieldTypes = new Map();
    for (const field of ormFields) {
      this.fieldTypes.set(field.type, field as ORMFieldConfig);
    }
    this.db = new InSpatialDB({
      ...options.dbConfig,
    });
    this.systemDb = this.db.withSchema("cloud_global");
    for (const entryType of options.entries) {
      adminRole.entryPermissions.set(entryType.name, {
        create: true,
        view: true,
        modify: true,
        delete: true,
      });
      this.#addEntryType(entryType);
    }
    for (const settingsType of options.settings) {
      adminRole.settingsPermissions.set(settingsType.name, {
        view: true,
        modify: true,
      });
      this.#addSettingsType(settingsType);
    }
    if (options.globalEntryHooks) {
      this.#setupHooks(options.globalEntryHooks);
    }
    this.#roles.setup();
  }
  async init(): Promise<void> {
    await this.db.init();
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
    this.#roles.addEntryType(entryType);
  }
  #addSettingsType(settingsType: SettingsType): void {
    this.#roles.addSettingsType(settingsType);
  }
  #getEntryInstance<E extends EntryBase = GenericEntry>(
    entryType: string,
  ): E {
    return this.#roles.getEntryInstance<E>(
      this,
      entryType,
      this._user || this.systemAdminUser,
    );
  }
  #getSettingsInstance<S extends SettingsBase = GenericSettings>(
    settingsType: string,
  ): S {
    return this.#roles.getSettingsInstance<S>(
      this,
      settingsType,
      this._user || this.systemAdminUser,
    );
  }
  getEntryType<T extends EntryType = EntryType>(
    entryType: string,
  ): T {
    return this.#roles.getEntryType<T>(
      entryType,
      this._user?.role || this.systemAdminUser.role,
    );
  }
  getSettingsType<T extends SettingsType = SettingsType>(
    settingsType: string,
  ): T {
    return this.#roles.getSettingsType<T>(
      settingsType,
      this._user?.role || this.systemAdminUser.role,
    );
  }
  getEntryTypeRegistry(
    entryType: string,
  ): EntryTypeRegistry | undefined {
    return this.#roles.getRegistry(
      entryType,
      this._user?.role || this.systemAdminUser.role,
    );
  }

  // Single Entry Operations
  /**
   * Creates a new entry in the database with the provided data.
   */
  async createEntry<E extends EntryBase = GenericEntry>(
    entryType: E["_name"],
    data: Record<string, any>,
  ): Promise<E> {
    const entry = this.#getEntryInstance(entryType) as E;
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
  ): E {
    const entry = this.#getEntryInstance(entryType) as E;
    entry.create();
    return entry;
  }
  /**
   * Gets an entry from the database by its ID.
   */
  async getEntry<E extends EntryBase = GenericEntry>(
    entryType: E["_name"],
    id: IDValue,
  ): Promise<E> {
    const entry = this.#getEntryInstance(entryType) as E;
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
  ): Promise<any> {
    const entry = await this.getEntry(entryType, id);
    entry.update(data);
    await entry.save();
  }

  /**
   * Deletes an entry from the database.
   */
  async deleteEntry<E extends EntryBase = GenericEntry>(
    entryType: E["_name"],
    id: string,
  ): Promise<any> {
    const entry = await this.getEntry(entryType, id);
    await entry.delete();
    return entry;
  }

  async findEntry<E extends EntryBase = GenericEntry>(
    entryType: E["_name"],
    filter: DBFilter,
  ): Promise<E | null> {
    const entryTypeObj = this.getEntryType(entryType);
    const tableName = entryTypeObj.config.tableName;
    const result = await this.db.getRows(tableName, {
      filter,
      limit: 1,
      columns: ["id"],
    });
    if (result.rowCount === 0) {
      return null;
    }
    const entry = await this.getEntry<E>(entryType, result.rows[0].id);
    return entry;
  }
  async findEntryId(
    entryType: string,
    filter: DBFilter,
  ): Promise<IDValue | null> {
    const entryTypeObj = this.getEntryType(entryType);
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
  ): Promise<GetListResponse<E>> {
    const entryTypeObj = this.getEntryType(entryType);
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
    if (entryTypeObj.permission.userScoped && this._user?.userId) {
      const idField = entryTypeObj.permission.userScoped.userIdField;
      const filter = {
        field: idField,
        op: "=",
        value: this._user.userId,
      };
      if (dbOptions.filter === undefined) {
        dbOptions.filter = [filter];
      } else if (Array.isArray(dbOptions.filter)) {
        dbOptions.filter.push(filter);
      } else {
        dbOptions.filter[idField] = this._user.userId;
      }
    }
    const result = await this.db.getRows(tableName, dbOptions);
    return result as GetListResponse<E>;
  }

  async count(
    entryType: string,
    filter?: DBFilter,
    groupBy?: Array<string>,
  ): Promise<number> {
    const entryTypeObj = this.getEntryType(entryType);
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
  ): Promise<T> {
    const settings = this.#getSettingsInstance(settingsType) as T;
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
  ): Promise<T> {
    const settings = await this.getSettings<T>(settingsType);
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
  ): Promise<any> {
    const settings = this.#getSettingsInstance(settingsType);
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
  async migrate(schema: string): Promise<Array<string>> {
    const adminRole = this.#roles.getRole("systemAdmin");
    const migrationPlanner = new MigrationPlanner({
      entryTypes: Array.from(adminRole.entryTypes.values()),
      settingsTypes: Array.from(adminRole.settingsTypes.values()),
      orm: this,
      db: this.db.withSchema(schema),
      onOutput: (message) => {
        inLog.info(message);
      },
    });
    return await migrationPlanner.migrate();
  }

  async migrateGlobal(): Promise<Array<string>> {
    inLog.info("Migrating global database...");
    const adminRole = this.#roles.getRole("systemAdmin");

    const migrationPlanner = new MigrationPlanner({
      entryTypes: adminRole.globalEntryTypes,
      settingsTypes: adminRole.globalSettingsTypes,
      orm: this,
      db: this.systemDb,
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
    const adminRole = this.#roles.getRole("systemAdmin");
    const migrationPlanner = new MigrationPlanner({
      entryTypes: Array.from(adminRole.entryTypes.values()),
      settingsTypes: Array.from(adminRole.settingsTypes.values()),
      orm: this,
      db: this.db,
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
    const adminRole = this.#roles.getRole("systemAdmin");
    for (const entryType of adminRole.entryTypes.values()) {
      await generateEntryInterface(this, entryType);
      generatedEntries.push(entryType.name);
    }
    for (const settingsType of adminRole.settingsTypes.values()) {
      await generateSettingsInterfaces(this, settingsType);
      generatedSettings.push(settingsType.name);
    }
    return {
      generatedEntries,
      generatedSettings,
    };
  }
}
