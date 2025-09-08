import { InSpatialDB } from "~/orm/db/inspatial-db.ts";
import { Currencies, type InFieldType } from "~/orm/field/field-def-types.ts";
import type { ORMFieldConfig } from "~/orm/field/orm-field.ts";
import type { EntryType } from "~/orm/entry/entry-type.ts";
import type { SettingsType } from "~/orm/settings/settings-type.ts";
import type {
  GetListResponse,
  GlobalEntryHooks,
  GlobalSettingsHooks,
  Tag,
} from "~/orm/orm-types.ts";
import type { Entry } from "~/orm/entry/entry.ts";
import { raiseORMException } from "~/orm/orm-exception.ts";

import type {
  DBConfig,
  DBFilter,
  DBListOptions,
  ListOptions,
} from "~/orm/db/db-types.ts";

import { MigrationPlanner } from "~/orm/migrate/migration-planner.ts";
import {
  generateEntryInterface,
  generateSettingsInterface,
} from "~/orm/build/generate-interface/generate-interface.ts";
import { ormFields } from "~/orm/field/fields.ts";

import type { InValue } from "~/orm/field/types.ts";
import type { IDValue, NewEntry, UpdateEntry } from "./entry/types.ts";
import type { InCloud } from "~/in-cloud.ts";
import type { RoleManager } from "./roles/role.ts";
import type { EntryTypeRegistry } from "./registry/connection-registry.ts";
import type { UserContext, UserID } from "../auth/types.ts";
import {
  handlePgError,
  isPgError,
  type PgError,
} from "./db/postgres/pgError.ts";
import type { Settings } from "./settings/settings.ts";
import {
  generateClientEntryTypes,
  generateClientSettingsTypes,
} from "./build/generate-interface/generate-client-interface.ts";
import { PGErrorCode } from "./db/postgres/maps/errorMap.ts";
import type { InLog } from "#inLog";
import { joinPath } from "../utils/path-utils.ts";
import convertString from "../utils/convert-string.ts";
import { formatInterfaceFile } from "./build/generate-interface/files-handling.ts";
import type {
  EntryMap,
  EntryName,
  SettingsMap,
  SettingsName,
} from "#types/models.ts";
import type { EntryFieldKeys } from "#types/mod.ts";

export class InSpatialORM {
  inLog: InLog;
  db: InSpatialDB;
  systemDb: InSpatialDB;
  fieldTypes: Map<InFieldType, ORMFieldConfig<any>>;
  _inCloud: InCloud;
  _user: UserContext | undefined;
  _accountId: string | undefined;
  readonly systemAdminUser: UserID = {
    role: "systemAdmin",
    userId: "systemAdmin",
  };
  readonly systemGobalUser: UserContext = {
    accountId: "cloud_global",
    userId: "systemAdmin",
    role: "systemAdmin",
  };
  roles: RoleManager;
  globalEntryHooks: GlobalEntryHooks = {
    beforeValidate: [],
    validate: [],
    beforeCreate: [],
    afterCreate: [],
    beforeUpdate: [],
    afterUpdate: [],
    beforeDelete: [],
    afterDelete: [],
  };
  globalSettingsHooks: GlobalSettingsHooks = {
    afterUpdate: [],
    beforeUpdate: [],
    beforeValidate: [],
    validate: [],
  };

  withUser(user: UserContext): InSpatialORM {
    if (!user) {
      raiseORMException(
        "User context is required to use withUser method",
        "ORMUserContext",
        400,
      );
    }
    const clone = Object.create(this) as InSpatialORM;
    clone._user = user;
    clone._accountId = user.accountId;
    clone.db = this.db.withSchema(user.accountId);
    return clone;
  }
  /** ORM instance for an account with admin privileges */
  withAccount(accountId: string): InSpatialORM {
    const clone = Object.create(this) as InSpatialORM;
    clone._user = { ...this.systemAdminUser, accountId };
    clone._accountId = accountId;
    clone.db = this.db.withSchema(accountId);
    return clone;
  }
  /**
   * The root path of the generated files for the ORM.
   */
  get generatedRoot(): string {
    return `${this.rootPath}/_generated`;
  }
  rootPath: string;
  async _runGlobalEntryHooks(
    hookType: keyof GlobalEntryHooks,
    entry: Entry,
  ): Promise<void> {
    for (const hook of this.globalEntryHooks[hookType]) {
      await hook({
        inCloud: this._inCloud,
        entryType: entry._name,
        entry,
        orm: this,
      });
    }
  }
  async _runGlobalSettingsHooks(
    hookType: keyof GlobalSettingsHooks,
    settings: Settings<any>,
  ): Promise<void> {
    for (const hook of this.globalSettingsHooks[hookType]) {
      await hook({
        inCloud: this._inCloud,
        settings,
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
      globalSettingsHooks?: GlobalSettingsHooks;
      globalEntryHooks?: GlobalEntryHooks;
      dbConfig: DBConfig | { query: (query: string) => Promise<any> };
      inCloud: InCloud;
    },
  ) {
    this.rootPath = options.rootPath || Deno.cwd();
    this.rootPath = `${this.rootPath}/.inspatial`;
    this.roles = options.inCloud.roles;

    this._inCloud = options.inCloud;
    this.inLog = this._inCloud.inLog;
    this.fieldTypes = new Map();
    for (const field of ormFields) {
      this.fieldTypes.set(field.type, field as ORMFieldConfig);
    }

    this.db = new InSpatialDB({
      ...options.dbConfig,
    });
    // this.db.schema = this.systemGobalUser.accountId; // "cloud_global" default
    this.systemDb = this.db.withSchema("cloud_global");
    for (const entryType of options.entries) {
      this.#addEntryType(entryType);
    }
    for (const settingsType of options.settings) {
      this.#addSettingsType(settingsType);
    }
    if (options.globalEntryHooks) {
      this.#setupGlobalEntryHooks(options.globalEntryHooks);
    }
    if (options.globalSettingsHooks) {
      this.#setupGlobalSettingsHooks(options.globalSettingsHooks);
    }
    this.roles.setup();
  }
  async init(): Promise<void> {
    await this.db.init();
  }
  #setupGlobalSettingsHooks(
    globalHooks: GlobalSettingsHooks,
  ): void {
    this.globalSettingsHooks.validate.push(...globalHooks.validate);
    this.globalSettingsHooks.beforeValidate.push(
      ...globalHooks.beforeValidate,
    );
    this.globalSettingsHooks.beforeUpdate.push(
      ...globalHooks.beforeUpdate,
    );
    this.globalSettingsHooks.afterUpdate.push(
      ...globalHooks.afterUpdate,
    );
  }
  #setupGlobalEntryHooks(globalHooks: GlobalEntryHooks): void {
    this.globalEntryHooks.validate.push(...globalHooks.validate);
    this.globalEntryHooks.beforeValidate.push(
      ...globalHooks.beforeValidate,
    );
    this.globalEntryHooks.beforeCreate.push(
      ...globalHooks.beforeCreate,
    );
    this.globalEntryHooks.afterCreate.push(
      ...globalHooks.afterCreate,
    );
    this.globalEntryHooks.beforeUpdate.push(
      ...globalHooks.beforeUpdate,
    );
    this.globalEntryHooks.afterUpdate.push(
      ...globalHooks.afterUpdate,
    );
    this.globalEntryHooks.beforeDelete.push(
      ...globalHooks.beforeDelete,
    );
    this.globalEntryHooks.afterDelete.push(
      ...globalHooks.afterDelete,
    );
  }
  #addEntryType(entryType: EntryType): void {
    this.#setDefaultCurrency(entryType);
    this.roles.addEntryType(entryType);
  }
  #addSettingsType(settingsType: SettingsType): void {
    this.#setDefaultCurrency(settingsType);
    this.roles.addSettingsType(settingsType);
  }
  #setDefaultCurrency(entryOrSettings: EntryType | SettingsType) {
    const defaultCurrency = this._inCloud.getExtensionConfigValue(
      "core",
      "defaultCurrency",
    );
    const currency = Currencies[defaultCurrency];
    for (const field of entryOrSettings.fields.values()) {
      if (field.type !== "CurrencyField") {
        continue;
      }
      if (!field.currencyCode) {
        field.currencyCode = defaultCurrency;
        field.currency = currency;
        continue;
      }
      if (!field.currency) {
        field.currency = Currencies[field.currencyCode];
        if (!field.currency) {
          raiseORMException(
            `Currency with code ${field.currencyCode} does not exist in Currencies`,
            "ORMField",
            400,
          );
        }
      }
    }
  }
  getEntryInstance<E extends EntryName>(
    entryType: E,
  ): EntryMap[E] {
    return this.roles.getEntryInstance<E>(
      this,
      entryType,
      this._user || this.systemAdminUser,
    );
  }
  getSettingsInstance<S extends SettingsName>(
    settingsType: S,
  ): SettingsMap[S] {
    return this.roles.getSettingsInstance<S>(
      this,
      settingsType,
      this._user || this.systemAdminUser,
    );
  }
  getEntryType<E extends EntryName = EntryName>(
    entryType: E,
  ): EntryType<E> {
    return this.roles.getEntryType<E>(
      entryType,
      this._user?.role || this.systemAdminUser.role,
    );
  }
  getSettingsType<S extends SettingsName>(
    settingsType: S,
  ): SettingsType<S> {
    return this.roles.getSettingsType(
      settingsType,
      this._user?.role || this.systemAdminUser.role,
    );
  }
  getEntryTypeRegistry(
    entryType: string,
  ): EntryTypeRegistry | undefined {
    return this.roles.getRegistry(
      entryType,
      this._user?.role || this.systemAdminUser.role,
    );
  }

  // Single Entry Operations
  /**
   * Creates a new entry in the database with the provided data.
   */
  async createEntry<E extends EntryName>(
    entryType: E,
    data: NewEntry<E>,
  ): Promise<EntryMap[E]> {
    const entry = this.getEntryInstance(entryType);
    entry.create();
    entry.update(data);
    await entry.save();
    return entry;
  }
  /**
   * Gets an instance of a new entry with default values set. This is not saved to the database.
   */
  getNewEntry<E extends EntryName>(
    entryType: E,
  ): EntryMap[E] {
    const entry = this.getEntryInstance(entryType);
    entry.create();
    return entry;
  }

  /**
   * Gets an entry from the database by its ID.
   */
  async getEntry<E extends EntryName>(
    entryType: E,
    id: IDValue,
  ): Promise<EntryMap[E]> {
    const entry = this.getEntryInstance(entryType);
    await entry.load(id);
    return entry;
  }
  /**
   * Updates an entry in the database with the provided data.
   * The data object should contain the fields that need to be updated with their new values.
   */
  async updateEntry<E extends EntryName>(
    entryType: E,
    id: string,
    data: UpdateEntry<E>,
  ): Promise<EntryMap[E]> {
    const entry = await this.getEntry<E>(entryType, id);
    entry.update(data);
    await entry.save();
    return entry;
  }

  /**
   * Deletes an entry from the database by its ID.
   */
  async deleteEntry<E extends EntryName>(
    entryType: E,
    id: string,
  ): Promise<EntryMap[E]> {
    const entry = await this.getEntry(entryType, id);
    try {
      await entry.delete();
    } catch (e) {
      if (!isPgError(e)) {
        throw e;
      }
      return this.handlePgError(e);
    }
    return entry;
  }

  async countConnections<E extends EntryName>(
    entryName: E,
    id: string,
  ): Promise<
    Array<{
      entryType: string;
      label: string;
      fieldKey: string;
      fieldLabel: string;
      count: number;
    }>
  > {
    const entryTypeObj = this.getEntryType(entryName);
    const results = [];
    for (const connection of entryTypeObj.connections) {
      const count = await this.count(connection.referencingEntry as EntryName, {
        filter: [{
          field: connection.referencingField,
          op: "=",
          value: id,
        }],
      });
      results.push({
        entryType: connection.referencingEntry,
        label: connection.referencingEntryLabel,
        fieldKey: connection.referencingField,
        fieldLabel: connection.referencingFieldLabel,
        count,
      });
    }
    return results;
  }
  /** Finds and returns an instance of a single entry matching the provided filter. Returns null if no entry is found. */
  async findEntry<E extends EntryName>(
    entryType: E,
    filter: DBFilter,
  ): Promise<EntryMap[E] | null> {
    const entryTypeObj = this.getEntryType(entryType);
    const tableName = entryTypeObj.config.tableName;
    const db = entryTypeObj.systemGlobal ? this.systemDb : this.db;
    const result = await db.getRows(tableName, {
      filter,
      limit: 1,
      columns: ["id"],
    });
    if (result.rowCount === 0) {
      return null;
    }
    const entry = await this.getEntry(entryType, result.rows[0].id);
    return entry;
  }
  /** Finds and returns the ID of a single entry matching the provided filter. Returns null if no entry is found. */
  async findEntryId<E extends EntryName>(
    entryType: E,
    filter: DBFilter,
  ): Promise<IDValue | null> {
    const entryTypeObj = this.getEntryType(entryType);
    const tableName = entryTypeObj.config.tableName;
    const db = entryTypeObj.systemGlobal ? this.systemDb : this.db;
    const result = await db.getRows(tableName, {
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
  async getEntryList<
    E extends EntryName,
  >(
    entryType: E,
    options?: ListOptions<EntryMap[E]>,
  ): Promise<GetListResponse<EntryMap[E]["__fields__"]>> {
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
    if (entryTypeObj.permission.userScope && this._user?.userId) {
      const idField = entryTypeObj.permission.userScope;
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
    const db = entryTypeObj.systemGlobal ? this.systemDb : this.db;
    try {
      const result = await db.getRows<EntryMap[E]["__fields__"]>(
        tableName,
        dbOptions,
      );
      return result;
    } catch (e) {
      if (!isPgError(e)) {
        throw e;
      }
      this.handlePgError(e);
    }
  }

  /** Tags Section **/

  /** Gets a list of all the tags currently in the system. */
  async getTags(): Promise<Array<Tag>> {
    const { rows } = await this.db.getRows<Tag>("inTag");
    return rows;
  }

  /** Checks if a tag with the given ID exists in the system.
   *  @param tagId The ID of the tag to check for.
   */
  async hasTag(tagId: number): Promise<boolean> {
    const result = await this.db.getRow("inTag", tagId);
    return !!result;
  }
  /** Gets a tag by its name. Returns null if not found.
   * @param tagName The name of the tag to search for.
   */
  async getTagByName(tagName: string): Promise<
    {
      id: number;
      name: string;
    } | null
  > {
    tagName = tagName.trim().toLowerCase();
    const result = await this.db.getRows<{
      id: number;
      name: string;
    }>("inTag", {
      columns: ["id", "name"],
      filter: { name: tagName },
      limit: 1,
    });
    if (result.rowCount === 0) {
      return null;
    }
    return result.rows[0];
  }
  /** Adds a new tag to the system. Tag names are unique and case insensitive.
   * @param tagName The name of the tag to add.
   */
  async addTag(tagName: string): Promise<{
    id: number;
    name: string;
  }> {
    tagName = tagName.trim().toLowerCase();
    try {
      const tag = await this.db.insertRow<{
        id: number;
        name: string;
      }>("inTag", { name: tagName });
      return tag;
    } catch (e) {
      if (!isPgError(e)) {
        throw e;
      }
      if (e.code === PGErrorCode.UniqueViolation) {
        raiseORMException(
          `Tag with name '${tagName}' already exists.`,
          "ORMTag",
          400,
        );
      }
      throw e;
    }
  }

  /** End Tags section **/
  /** Sums the values of specified fields for entries of a specific EntryType, with optional filtering and grouping. */
  async sum(entryType: string, options: {
    fields: Array<string>;
    filter?: DBFilter;
    orFilter?: DBFilter;
  }): Promise<Record<string, number>>;
  async sum(entryType: string, options: {
    fields: Array<string>;
    filter?: DBFilter;
    orFilter?: DBFilter;
    groupBy: Array<string>;
  }): Promise<
    Array<
      Record<string, string> & Record<string, number>
    >
  >;
  async sum<E extends EntryName>(entryType: E, options: {
    fields: Array<EntryFieldKeys<E>>;
    filter?: DBFilter;
    orFilter?: DBFilter;
    groupBy?: Array<string>;
  }) {
    const entryTypeObj = this.getEntryType(entryType);
    const db = entryTypeObj.systemGlobal ? this.systemDb : this.db;
    const tableName = entryTypeObj.config.tableName;
    const sumColumns = new Set<string>();
    const groupByColumns = new Set<string>();
    for (const field of options.fields) {
      const inField = entryTypeObj.fields.get(field);
      if (!inField) {
        raiseORMException(
          `Field with key ${field} does not exist in EntryType ${entryType}`,
        );
      }

      switch (inField.type) {
        case "CurrencyField":
        case "IntField":
        case "DecimalField":
        case "BigIntField":
          // These fields can be summed
          break;
        default:
          raiseORMException(
            `Field with key ${field} in EntryType ${entryType} is not a valid field type for summation. Supported types are: CurrencyField, IntField, DecimalField, BigIntField.`,
            "ORMField",
            400,
          );
      }
      sumColumns.add(field);
    }
    for (const field of options.groupBy || []) {
      if (sumColumns.has(field)) {
        continue;
      }
      const inField = entryTypeObj.fields.get(field);
      if (!inField) {
        raiseORMException(
          `Field with key ${field} does not exist in EntryType ${entryType}`,
        );
      }

      groupByColumns.add(inField.key);
    }
    if (groupByColumns.size === 0) {
      return await db.sum(tableName, {
        columns: Array.from(sumColumns),
        filter: options.filter,
        orFilter: options.orFilter,
      });
    }
    return await db.sum(tableName, {
      columns: Array.from(sumColumns),
      filter: options.filter,
      orFilter: options.orFilter,
      groupBy: Array.from(groupByColumns),
    });
  }
  /** Counts the number of entries for a specific EntryType, with optional filtering and grouping. */
  async count<E extends EntryName>(
    entryType: E,
    options?: {
      filter?: DBFilter;
      orFilter?: DBFilter;
      groupBy?: Array<EntryFieldKeys<E>>;
    },
  ): Promise<number> {
    const entryTypeObj = this.getEntryType(entryType);
    const { filter, orFilter, groupBy } = options || {};
    const db = entryTypeObj.systemGlobal ? this.systemDb : this.db;
    const tableName = entryTypeObj.config.tableName;
    const groupByColumns = new Set<string>();
    if (groupBy) {
      for (const field of groupBy) {
        const inField = entryTypeObj.fields.get(field);
        if (!inField) {
          raiseORMException(
            `Field with key ${field} does not exist in EntryType ${entryType}`,
          );
        }
        groupByColumns.add(inField.key);
      }
    }
    const result = await db.count(tableName, {
      filter,
      orFilter,
      groupBy: groupByColumns.size > 0 ? Array.from(groupByColumns) : undefined,
    });

    return result;
  }
  // Special Operations

  /**
   * Gets the value of a specific field in an entry.
   */
  getEntryValue<E extends EntryName>(
    _entryType: E,
    _id: string,
    _field: keyof EntryMap[E]["__fields__"],
  ): Promise<any> {
    raiseORMException(
      `getEntryValue is not implemented yet. Use getEntry instead.`,
      "ORMField",
      501,
    );
  }

  // Settings

  /**
   * Gets all the settings for a specific `SettingsType`.
   */
  async getSettings<S extends SettingsName>(
    settingsType: S,
  ): Promise<SettingsMap[S]> {
    const settings = this.getSettingsInstance(settingsType);
    await settings.load();
    return settings;
  }
  /**
   * Updates the settings for a specific settings type.
   */
  async updateSettings<
    S extends SettingsName,
  >(
    settingsType: S,
    data: Partial<SettingsMap[S]["__fields__"]>,
  ): Promise<SettingsMap[S]> {
    const settings = await this.getSettings(settingsType);
    settings.update(data);
    await settings.save();
    return settings;
  }

  /**
   * Gets the value of a specific setting field.
   */
  async getSettingsValue<
    S extends SettingsName,
    K extends keyof SettingsMap[S]["__fields__"],
  >(
    settingsType: S,
    field: K,
  ): Promise<SettingsMap[S]["__fields__"][K]> {
    const settings = this.getSettingsInstance(settingsType);
    return await settings.getValue(field as string);
  }

  /**
   * Updates the value of a specific field for multiple entries. This is used internally by the ORM to update the title value of connection fields.
   */
  async batchUpdateField(
    entryType: string,
    fieldOrChildField: string | { child: string; field: string },
    value: InValue,
    filters: DBFilter,
  ): Promise<void> {
    const entryTypeDef = this.getEntryType(entryType as EntryName);
    if (typeof fieldOrChildField === "string") {
      const field = fieldOrChildField;
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
      const db = entryTypeDef.systemGlobal ? this.systemDb : this.db;
      await db.batchUpdateColumn(
        entryTypeDef.config.tableName,
        field,
        value,
        filters,
      );
      return;
    }
    if (typeof fieldOrChildField === "object" && "child" in fieldOrChildField) {
      const { child, field } = fieldOrChildField;
      const childEntryType = entryTypeDef.children?.get(child);
      if (!childEntryType) {
        raiseORMException(
          `EntryType ${entryType} doesn't have a child with key '${child}'`,
        );
      }
      if (!childEntryType.fields.has(field)) {
        raiseORMException(
          `Child EntryType ${childEntryType.name} doesn't have a field with key '${field}'`,
        );
      }
      const inField = childEntryType.fields.get(field)!;
      const fieldType = this._getFieldType(inField.type);
      value = fieldType.normalize(value, inField);
      if (!fieldType.validate(value, inField)) {
        raiseORMException("Value is not valid!");
      }
      value = fieldType.prepareForDB(value, inField);
      const db = entryTypeDef.systemGlobal ? this.systemDb : this.db;
      if (!childEntryType.config.tableName) {
        raiseORMException(
          `Child EntryType ${childEntryType.name} does not have a table name defined.`,
          "ORMField",
          500,
        );
      }
      await db.batchUpdateColumn(
        childEntryType.config.tableName,
        field,
        value,
        filters,
      );

      return;
    }
  }

  /**
   * Synchronizes the ORM models with the database based on the output of the planMigration method.
   * The schema passed to this method is the account ID of the account/tenant to be migrated.
   */
  async migrate(schema: IDValue): Promise<Array<string> | undefined> {
    if (typeof schema !== "string") {
      schema = schema.toString();
    }
    const adminRole = this.roles.getRole("systemAdmin");
    const migrationPlanner = new MigrationPlanner({
      entryTypes: adminRole.accountEntryTypes,
      settingsTypes: adminRole.accountSettingsTypes,
      orm: this,
      db: this.db.withSchema(schema),
      onOutput: (message) => {
        this.inLog.info(message);
      },
    });
    try {
      return await migrationPlanner.migrate();
    } catch (e) {
      if (!isPgError(e)) {
        throw e;
      }
      const { response, subject } = handlePgError(e);
      this.inLog.warn(response, {
        subject,
      });
    }
  }
  /**
   * Synchronizes the systemGlobal ORM models with the shared database schema `cloud_global`
   */
  async migrateGlobal(): Promise<Array<string>> {
    const adminRole = this.roles.getRole("systemAdmin");

    const migrationPlanner = new MigrationPlanner({
      entryTypes: adminRole.globalEntryTypes,
      settingsTypes: adminRole.globalSettingsTypes,
      orm: this,
      db: this.systemDb,
      onOutput: (message) => {
        this.inLog.info(message);
      },
    });
    try {
      return await migrationPlanner.migrate();
    } catch (e) {
      if (!isPgError(e)) {
        throw e;
      }
      const { response, subject } = handlePgError(e);
      this.inLog.warn(response, {
        subject,
      });
      Deno.exit(1);
    }
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
    const adminRole = this.roles.getRole("systemAdmin");

    const output: string[] = [
      `/* This file is auto-generated by InSpatial ORM. Do not edit manually. */`,
      'import type { EntryBase, SettingsBase, ChildList } from "@inspatial/cloud/types";',
      'declare module "@inspatial/cloud/models" {',
    ];
    const libOut: string[] = [
      `/* This file is auto-generated by InSpatial ORM. Do not edit manually. */`,
      `import type { EntryBase } from "../orm/entry/entry-base.ts";`,
      `import type { ChildEntryList as ChildList } from "../orm/child-entry/child-entry.ts";`,
      `import type { SettingsBase } from "../orm/settings/settings-base.ts";`,
      "",
    ];
    const libEntries: string[] = [];
    const libSettings: string[] = [];
    let libPath = "";
    for (const entryType of adminRole.entryTypes.values()) {
      const entryString = generateEntryInterface(entryType);
      if (entryType.dir) {
        switch (entryType.config.extension?.key) {
          case "core":
            libPath = entryType.dir;
            libOut.push(entryString);
            libEntries.push(entryType.name);
            break;
          default:
            output.push(entryString);
            generatedEntries.push(entryType.name);
        }
      }
    }
    for (const settingsType of adminRole.settingsTypes.values()) {
      const settingsString = generateSettingsInterface(settingsType);
      if (settingsType.dir) {
        switch (settingsType.config.extension?.key) {
          case "core":
            libPath = settingsType.dir;
            libOut.push(settingsString);
            libSettings.push(settingsType.name);
            break;
          default:
            output.push(settingsString);
            generatedSettings.push(settingsType.name);
        }
      }
    }

    output.push(
      "export interface EntryMap {",
      generatedEntries.map((e) => {
        return `  ${e}: ${convertString(e, "pascal", true)};`;
      }).join("\n"),
      "}",
    );
    libOut.push(
      "export interface EntryMap {",
      libEntries.map((e) => {
        return `  ${e}: ${convertString(e, "pascal", true)};`;
      }).join("\n"),
      "}",
    );

    output.push(
      "export interface SettingsMap {",
      generatedSettings.map((s) => {
        return `  ${s}: ${convertString(s, "pascal", true)};`;
      }).join("\n"),
      "}",
    );
    output.push("}");
    libOut.push(
      "export interface SettingsMap {",
      libSettings.map((s) => {
        return `  ${s}: ${convertString(s, "pascal", true)};`;
      }).join("\n"),
      "}",
    );

    libOut.push(
      "export type EntryName = Exclude<keyof EntryMap, symbol | number>;",
      "export type SettingsName = Exclude<keyof SettingsMap, symbol | number>;",
    );

    const path = joinPath(this.rootPath, "models.d.ts");
    libPath = libPath.match(/(.+\/inspatial-cloud)\/src/)?.[1] || "";
    if (libPath) {
      const libFile = joinPath(libPath, "src", "types", "models.ts");

      libOut.push("");
      await Deno.writeTextFile(libFile, libOut.join("\n"), {
        create: true,
      });
      await formatInterfaceFile(libFile);
    }
    await Deno.writeTextFile(path, output.join("\n\n"), {
      create: true,
    });
    await formatInterfaceFile(path);

    return {
      generatedEntries,
      generatedSettings,
    };
  }

  generateClientInterfaces(): string {
    // const generatedSettings: string[] = [];
    const adminRole = this.roles.getRole("systemAdmin");
    const entryTypes = Array.from(adminRole.entryTypes.values());
    const entriesInterfaces = generateClientEntryTypes(entryTypes);
    const settingsTypes = Array.from(
      adminRole.settingsTypes.values(),
    );
    const settingsInterfaces = generateClientSettingsTypes(
      settingsTypes,
    );

    return entriesInterfaces + "\n\n" + settingsInterfaces;
  }
  handlePgError(e: PgError): never {
    const { info, response, subject } = handlePgError(e);
    const code = info.code as PGErrorCode;
    switch (code) {
      case PGErrorCode.ForeignKeyViolation: {
        const table = info.table as string;
        const id = info.id as string;
        const parts = table
          ?.split("_") || [table];
        const firstPart = parts[0];
        switch (firstPart) {
          case "entry": {
            break;
          }
          case "child": {
            break;
          }
        }
        raiseORMException(
          `Cannot delete entry with id ${id} because it is referenced by another entry (${table}). Please delete the referencing entries first.`,
          "ORMForeignKeyViolation",
          400,
        );
        break;
      }
      case PGErrorCode.UniqueViolation:
        raiseORMException(
          `Cannot create or update entry because it would violate a unique constraint. ${response}`,
          "ORMUniqueViolation",
          400,
        );
        break;
      default: {
        raiseORMException(response.join("\n"), subject, 400);
      }
    }
  }
}
