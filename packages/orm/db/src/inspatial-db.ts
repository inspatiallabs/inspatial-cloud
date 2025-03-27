import type {
  AdvancedFilter,
  CountGroupedResult,
  DBConfig,
  DBFilter,
  DBListOptions,
  PgColumnDefinition,
  PgDataTypeDefinition,
  PostgresColumn,
  QueryResultFormatted,
  TableConstraint,
  ValueType,
} from "#db/types.ts";
import { PostgresClient } from "#db/postgres/pgClient.ts";

import { camelToSnakeCase, toCamelCase } from "#db/utils.ts";
import { ormLogger } from "#/logger.ts";
import { convertString } from "@inspatial/serve/utils";
import { IDMode } from "#/field/types.ts";
import { IDValue } from "#/entry/types.ts";
/**
 * InSpatialDB is an interface for interacting with a Postgres database
 */
export class InSpatialDB {
  /**
   * The configuration for the database
   */
  config: DBConfig;
  /**
   * The name of the database to connect to
   */
  dbName: string;
  /**
   * The schema to use for the database. Default is 'public'
   */
  schema: string;
  /**
   * The Postgres client used to interact with the database
   */
  #client?: PostgresClient;

  /**
   * The version of the database
   */
  #version: string | undefined;

  /**
   * Get the version number of the postgres database
   */
  async version(): Promise<string> {
    if (!this.#version) {
      const response = await this.query<{ version: string }>(
        "SELECT version();",
      );
      this.#version = response.rows[0].version;
    }
    return this.#version;
  }

  /**
   * Get a PostgresClient instance for interacting with the database
   */
  get client(): PostgresClient {
    if (!this.#client) {
      this.#client = new PostgresClient(this.config.connection);
    }

    return this.#client;
  }

  /**
   * Send a query to the database
   */
  async #query<T extends Record<string, any>>(
    query: string,
  ) {
    const client = this.client;
    if (!client.connected) {
      try {
        await client.connect();
      } catch (e) {
        ormLogger.warn(`Error connecting to database: ${e}`);
        throw e;
      }
    }
    await client.ready;
    const result = await client.query<T>(query).catch((e) => {
      client.resetReady();
      throw e;
    });
    return result;
  }
  /**
   * InSpatialDB is an interface for interacting with a Postgres database
   */
  constructor(config: DBConfig) {
    this.config = config;
    this.dbName = config.connection.database;
    this.schema = config.connection.schema || "public";
  }

  /**
   * Send a query to the database and return the result.
   * The result is formatted to use camelCase for column names
   * @param query The query to send to the database
   */
  async query<T extends Record<string, any> = Record<string, any>>(
    query: string,
  ): Promise<QueryResultFormatted<T>> {
    ormLogger.debug(`Query: ${query}`);
    const result = await this.#query<T>(query);
    const columns = result.columns.map((column) => column.camelName);
    return {
      rowCount: result.rowCount,
      rows: result.rows,
      columns,
    };
  }

  /**
   * Get a list of column definitions for a table
   */
  async getTableColumns(tableName: string): Promise<PostgresColumn[]> {
    tableName = this.#toSnake(tableName);
    const columns = [
      "tableCatalog",
      "tableSchema",
      "tableName",
      "columnName",
      "ordinalPosition",
      "columnDefault",
      "isNullable",
      "dataType",
      "characterMaximumLength",
      "characterOctetLength",
      "numericPrecision",
      "numericPrecisionRadix",
      "numericScale",
      "datetimePrecision",
      "intervalType",
      "intervalPrecision",
      // "characterSetCatalog",
      // "characterSetSchema",
      // "characterSetName",
      // "collationCatalog",
      // "collationSchema",
      // "collationName",
      "domainCatalog",
      "domainSchema",
      "domainName",
      "udtCatalog",
      "udtSchema",
      "udtName",
      // "scopeCatalog",
      // "scopeSchema",
      // "scopeName",
      "maximumCardinality",
      "dtdIdentifier",
      "isSelfReferencing",
      "isIdentity",
      "identityGeneration",
      "identityStart",
      "identityIncrement",
      "identityMaximum",
      "identityMinimum",
      "identityCycle",
      "isGenerated",
      "generationExpression",
      "isUpdatable",
    ];
    const formattedColumns = columns.map((column) =>
      this.#formatColumnName(column)
    );
    const query = `SELECT ${
      formattedColumns.join(", ")
    } FROM information_schema.columns WHERE table_schema = '${this.schema}' AND table_name = '${tableName}'`;
    const result = await this.query<PostgresColumn>(query);
    return result.rows.map((row) => {
      return {
        ...row,
        columnName: this.#snakeToCamel(row.columnName),
      };
    });
  }

  /**
   * Add a comment to a table
   */
  async addTableComment(tableName: string, comment: string): Promise<void> {
    tableName = this.#toSnake(tableName);
    const query =
      `COMMENT ON TABLE ${this.schema}.${tableName} IS '${comment}'`;
    await this.query(query);
  }

  /**
   * Get the comment for a table
   */
  async getTableComment(tableName: string): Promise<string> {
    tableName = this.#toSnake(tableName);
    const query =
      `SELECT obj_description('${this.schema}.${tableName}'::regclass, 'pg_class') as comment`;
    const result = await this.query<{ comment: string }>(query);
    return result.rows[0].comment;
  }
  /**
   * Get a list of table names in the database
   */
  async getTableNames(): Promise<string[]> {
    const query =
      `SELECT table_name FROM information_schema.tables WHERE table_schema = '${this.schema}'`;
    const result = await this.query<{ tableName: string }>(query);
    return result.rows.map((row) => this.#snakeToCamel(row.tableName));
  }

  /**
   * Check if a table exists in the database
   */
  async tableExists(tableName: string): Promise<boolean> {
    tableName = this.#toSnake(tableName);
    const query =
      `SELECT table_name FROM information_schema.tables WHERE table_schema = '${this.schema}' AND table_name = '${tableName}'`;
    const result = await this.query<{ tableName: string }>(query);
    return result.rowCount > 0;
  }

  /**
   * Create a table in the database. If the table already exists, this will do nothing.
   * @param tableName The name of the table to create
   * @param idMode The mode for the id column. Default is 'ulid'. Options are `auto` which is an auto incremented integer, 'ulid', 'uuid'
   */
  async createTable(
    tableName: string,
    idMode?: IDMode | "manual",
  ): Promise<void> {
    tableName = this.#toSnake(tableName);
    idMode = idMode || "ulid";
    let query = `CREATE TABLE IF NOT EXISTS ${this.schema}.${tableName} ( id`;
    switch (idMode) {
      case "auto":
        query += ` bigint GENERATED ALWAYS AS IDENTITY`;
        break;

      case "ulid":
        query += ` CHAR(26)`;
        break;
      case "uuid":
        query += ` UUID`;
        break;
      case "manual":
        query += ` CHAR(255)`;
    }
    query += ` PRIMARY KEY )`;
    await this.query(query);
  }

  /**
   * Single Row Operations
   */

  /**
   * Insert a row into a table
   * @param tableName
   * @param data
   * @returns
   */
  async insertRow<T extends Record<string, any> = Record<string, any>>(
    tableName: string,
    data: Record<string, any>,
  ): Promise<QueryResultFormatted<T>["rows"][number]> {
    tableName = this.#toSnake(tableName);
    const columnKeys = Object.keys(data);
    const columns = columnKeys.map((key) => {
      return this.#formatColumnName(key);
    });

    const values = columnKeys.map((key) => {
      return this.#formatValue(data[key]);
    });
    const query = `INSERT INTO ${this.schema}.${tableName} (${
      columns.join(", ")
    }) VALUES (${values.join(", ")}) RETURNING *`;
    const result = await this.query<T>(query);
    return result.rows[0];
  }

  /**
   *  Get a single row from a table
   * @param tableName
   * @param value  The value of the id column
   * @returns
   */
  async getRow<T extends Record<string, any> = Record<string, any>>(
    tableName: string,
    value: any,
  ): Promise<T | undefined> {
    tableName = this.#toSnake(tableName);
    value = this.#formatValue(value);
    const query =
      `SELECT * FROM ${this.schema}.${tableName} WHERE id = ${value}`;
    const result = await this.query<T>(query);
    if (result.rowCount === 0) {
      return undefined;
    }
    return result.rows[0];
  }

  /**
   * Update a row in a table
   * @param tableName
   * @param id
   * @param data
   * @returns The updated row
   */
  async updateRow<T extends Record<string, any> = Record<string, any>>(
    tableName: string,
    id: string | number,
    data: Record<string, any>,
  ): Promise<QueryResultFormatted<T>> {
    tableName = this.#toSnake(tableName);
    const values = Object.entries(data).map(([key, value]) => {
      return `${this.#formatColumnName(key)} = ${this.#formatValue(value)}`;
    });
    const idValue = this.#formatValue(id);

    const query = `UPDATE ${this.schema}.${tableName} SET ${
      values.join(", ")
    } WHERE id = ${idValue} RETURNING *`;
    return await this.query<T>(query);
  }

  /**
   * Delete a row from a table by id
   * @param tableName
   * @param id
   */
  async deleteRow(tableName: string, id: IDValue): Promise<void> {
    tableName = this.#toSnake(tableName);
    const query = `DELETE FROM ${this.schema}.${tableName} WHERE id = ${
      this.#formatValue(id)
    }`;
    await this.query(query);
  }

  /**
   * Multiple Row Operations
   */

  /**
   * Delete multiple rows from a table
   * @param tableName
   * @param filters
   */
  async deleteRows(
    tableName: string,
    filters?: DBFilter,
  ): Promise<void> {
    tableName = this.#toSnake(tableName);
    let query = `DELETE FROM ${this.schema}.${tableName}`;
    if (filters) {
      query += " WHERE ";
      query += this.#makeFilter(filters);
    }
    await this.query(query);
  }
  /**
   * Get multiple rows from a table
   * @param tableName The name of the table
   * @param options {DBListOptions}  The options for the query
   */
  async getRows<T extends Record<string, any> = Record<string, any>>(
    tableName: string,
    options?: DBListOptions,
  ): Promise<QueryResultFormatted<T> & { totalCount: number }> {
    tableName = this.#toSnake(tableName);
    if (!options) {
      options = {} as DBListOptions;
    }
    let columns = "*";
    if (options.columns && Array.isArray(options.columns)) {
      columns = options.columns.map((column) => {
        if (typeof column === "object") {
          return this.#makeMultiChoiceFieldQuery(
            this.schema,
            tableName,
            column.entryType,
            column.key,
          );
        }
        return this.#formatColumnName(column);
      }).join(", ");
    }
    let query = `SELECT ${columns} FROM ${this.schema}.${tableName}`;
    let countQuery = `SELECT COUNT(*) FROM ${this.schema}.${tableName}`;
    let andFilter = "";
    let orFilter = "";
    if (options.filter) {
      andFilter = this.#makeAndFilter(options.filter);
    }
    if (options.orFilter) {
      orFilter = this.#makeOrFilter(options.orFilter);
    }
    if (andFilter && orFilter) {
      query += ` WHERE ${andFilter} AND (${orFilter})`;
      countQuery += ` WHERE ${andFilter} AND (${orFilter})`;
    } else if (andFilter) {
      query += ` WHERE ${andFilter}`;
      countQuery += ` WHERE ${andFilter}`;
    } else if (orFilter) {
      query += ` WHERE ${orFilter}`;
      countQuery += ` WHERE ${orFilter}`;
    }

    if (options.orderBy) {
      query += ` ORDER BY ${this.#formatColumnName(options.orderBy)}`;
      const order = options.order || "ASC";
      query += ` ${order}`;
    }

    if (options.limit) {
      query += ` LIMIT ${options.limit}`;
    }

    if (options.offset) {
      query += ` OFFSET ${options.offset}`;
    }
    const result = await this.query<T>(query);
    let totalCount = result.rowCount;

    if (options.limit) {
      const countResult = await this.query<{ count: number }>(countQuery);
      totalCount = countResult.rows[0].count;
    }

    return {
      rowCount: totalCount,
      rows: result.rows,
      columns: result.columns,
      totalCount,
    };
  }

  /**
   * Update the value of a column in multiple rows of a table based on the provided filters
   */
  async batchUpdateColumn(
    tableName: string,
    column: string,
    value: any,
    filters: DBFilter,
  ): Promise<void> {
    tableName = this.#toSnake(tableName);
    let query = `UPDATE ${this.schema}.${tableName} SET ${
      this.#formatColumnName(column)
    } = ${this.#formatValue(value)}`;
    if (filters) {
      query += " WHERE ";
      query += this.#makeFilter(filters);
    }
    await this.query(query);
  }
  /**
   * Get a single value from a table by row id
   */
  async getValue<T = any>(
    tableName: string,
    id: string,
    column: string,
  ): Promise<T | undefined> {
    tableName = this.#toSnake(tableName);
    const query = `SELECT ${
      this.#formatColumnName(column)
    } FROM ${this.schema}.${tableName} WHERE id = ${this.#formatValue(id)}`;
    const result = await this.query<Record<string, T>>(query);
    if (result.rowCount === 0) {
      return undefined;
    }
    return result.rows[0][column];
  }

  /**
   * Count the number of rows in a table that match the filter
   */
  async count<K extends Array<PropertyKey>>(
    tableName: string,
    options?: {
      filter?: DBFilter;
      orFilter?: DBFilter;
      groupBy?: K;
    },
  ): Promise<any> {
    tableName = this.#toSnake(tableName);
    let countQuery = `SELECT COUNT(*) FROM ${this.schema}.${tableName}`;
    if (options?.groupBy) {
      countQuery = `SELECT ${
        options.groupBy.map((column) => {
          return this.#formatColumnName(column as string);
        }).join(", ")
      }, COUNT(*) FROM ${this.schema}.${tableName}`;
    }
    let andFilter = "";
    let orFilter = "";
    if (options?.filter) {
      andFilter = this.#makeAndFilter(options.filter);
    }
    if (options?.orFilter) {
      orFilter = this.#makeOrFilter(options.orFilter);
    }
    if (andFilter && orFilter) {
      countQuery += ` WHERE ${andFilter} AND (${orFilter})`;
    } else if (andFilter) {
      countQuery += ` WHERE ${andFilter}`;
    } else if (orFilter) {
      countQuery += ` WHERE ${orFilter}`;
    }
    if (options?.groupBy) {
      countQuery += ` GROUP BY ${
        options.groupBy.map((column) => {
          return this.#formatColumnName(column as string);
        }).join(", ")
      }`;
      const groupedResult = await this.query<CountGroupedResult<K>>(countQuery);
      return groupedResult.rows;
    }
    const countResult = await this.query<{ count: number }>(countQuery);
    return countResult.rows[0].count;
  }
  /**
   * Drop a table from the database
   */
  dropTable(tableName: string): Promise<void> {
    tableName = this.#toSnake(tableName);
    throw new Error(`dropTable not implemented for postgres`);
  }
  /**
   * Create an index on a table based on the provided columns
   */
  async createIndex(
    options: {
      tableName: string;
      indexName: string;
      columns: string[] | string;
      include?: string[];
      unique?: boolean;
    },
  ): Promise<void> {
    const { tableName, indexName, columns, unique } = options;
    const uniqueStr = unique ? "UNIQUE" : "";
    const tableNameSnake = this.#toSnake(tableName);

    const fieldsStr = (Array.isArray(columns) ? columns : [columns]).map(
      (column) => this.#formatColumnName(column),
    ).join(", ");
    const includeStr = options.include
      ? `INCLUDE (${
        options.include.map((col) => this.#formatColumnName(col)).join(", ")
      })`
      : "";
    const query =
      `CREATE ${uniqueStr} INDEX IF NOT EXISTS ${indexName} ON ${this.schema}.${tableNameSnake} (${fieldsStr}) ${includeStr}`;
    await this.query(query);
  }
  /**
   * Drop an index from the database by index name
   * @param tableName The name of the table
   * @param indexName The name of the index
   */
  async dropIndex(tableName: string, indexName: string): Promise<void> {
    tableName = this.#toSnake(tableName);
    const query = `DROP INDEX ${indexName}`;
    await this.query(query);
  }

  /**
   * Check if an index exists on a table
   */
  async hasIndex(tableName: string, indexName: string): Promise<boolean> {
    tableName = this.#toSnake(tableName);
    const query =
      `SELECT indexname FROM pg_indexes WHERE tablename = '${tableName}' AND indexname = '${indexName}'`;
    const result = await this.query<{ indexname: string }>(query);
    return result.rowCount > 0;
  }

  /**
   * Get an index info from a table
   */
  async getIndex(tableName: string, indexName: string): Promise<any> {
    tableName = this.#toSnake(tableName);
    const query =
      `SELECT * FROM pg_indexes WHERE tablename = '${tableName}' AND indexname = '${indexName}'`;
    const result = await this.query(query);
    if (result.rowCount === 0) {
      return undefined;
    }
    return result.rows[0];
  }
  /**
   * Run a VACUUM ANALYZE on the database or a specific table
   */
  async vacuumAnalyze(tableName?: string): Promise<QueryResultFormatted> {
    if (!tableName) {
      const query = `VACUUM ANALYZE`;
      return await this.query(query);
    }
    tableName = this.#toSnake(tableName);
    const query = `VACUUM ANALYZE ${this.schema}.${tableName}`;
    return await this.query(query);
  }
  /* Column Operations */

  /**
   * Add a column to a table
   */
  async addColumn(
    tableName: string,
    column: PgColumnDefinition,
  ): Promise<void> {
    tableName = this.#toSnake(tableName);
    const columnName = convertString(column.columnName, "snake", true);

    let query = `ALTER TABLE ${this.schema}.${tableName} ADD "${columnName}"`;

    switch (column.dataType) {
      case "character varying":
        query += ` VARCHAR`;
        if (column.characterMaximumLength) {
          query += `(${column.characterMaximumLength})`;
        }
        break;
      case "numeric":
        query += ` NUMERIC`;
        if (column.numericPrecision) {
          query += `(${column.numericPrecision}`;
          if (column.numericScale) {
            query += `, ${column.numericScale}`;
          }
          query += ")";
        }
        break;
      default:
        query += ` ${column.dataType || "TEXT"}`;
        break;
    }
    if (column.isNullable === "NO") {
      query += ` NOT NULL`;
    }
    if (column.columnDefault) {
      query += ` DEFAULT ${column.columnDefault}`;
    }

    // return query;
    await this.query(query);
    if (column.unique) {
      await this.makeColumnUnique(tableName, columnName);
    }
  }
  /**
   * Drop a column from a table
   */
  async removeColumn(tableName: string, columnName: string): Promise<void> {
    tableName = this.#toSnake(tableName);
    columnName = this.#formatColumnName(columnName);
    const query =
      `ALTER TABLE ${this.schema}.${tableName} DROP COLUMN ${columnName}`;
    await this.query(query);
  }

  /**
   * Change the data type of a column.
   */
  async changeColumnDataType(
    tableName: string,
    columnName: string,
    columnDataType: PgDataTypeDefinition,
  ): Promise<void> {
    tableName = this.#toSnake(tableName);
    columnName = this.#formatColumnName(columnName);
    let query =
      `ALTER TABLE ${this.schema}.${tableName} ALTER COLUMN ${columnName}`;
    const { dataType } = columnDataType;
    switch (dataType) {
      case "character varying":
        query += ` TYPE VARCHAR`;
        if (columnDataType.characterMaximumLength) {
          query += `(${columnDataType.characterMaximumLength})`;
        }
        break;
      default:
        query += ` TYPE ${dataType}`;
        break;
    }
    await this.query(query);
  }

  /**
   * Add a unique constraint to a column
   * @param tableName The name of the table
   * @param columnName The name of the column
   */
  async makeColumnUnique(tableName: string, columnName: string): Promise<void> {
    tableName = this.#toSnake(tableName);
    columnName = this.#formatColumnName(columnName);
    const query =
      `ALTER TABLE ${this.schema}.${tableName} ADD CONSTRAINT ${tableName}_${columnName}_unique UNIQUE (${columnName})`;
    await this.query(query);
  }
  /**
   * Remove a unique constraint from a column
   */
  async removeColumnUnique(
    tableName: string,
    columnName: string,
  ): Promise<void> {
    tableName = this.#toSnake(tableName);
    columnName = this.#formatColumnName(columnName);
    const query =
      `ALTER TABLE ${this.schema}.${tableName} DROP CONSTRAINT IF EXISTS ${tableName}_${columnName}_unique`;
    await this.query(query);
  }

  /**
   * Set a column to allow null values or not
   * @param tableName The name of the table
   * @param columnName The name of the column
   * @param allowNull Whether the column should allow null values
   */
  async setColumnNull(
    tableName: string,
    columnName: string,
    allowNull: boolean,
  ): Promise<void> {
    tableName = this.#toSnake(tableName);
    columnName = this.#formatColumnName(columnName);
    const query =
      `ALTER TABLE ${this.schema}.${tableName} ALTER COLUMN ${columnName} ${
        allowNull ? "DROP NOT NULL" : "SET NOT NULL"
      }`;
    await this.query(query);
  }

  /**
   * Add a foreign key constraint to a column
   */
  async addForeignKey(foreignKey: {
    /**
     * The name of the table
     */
    tableName: string;
    /**
     * The name of the column
     */
    columnName: string;
    /**
     * The name of the foreign table
     */
    foreignTableName: string;
    /**
     * The name of the foreign column
     */
    foreignColumnName: string;
    /**
     * The name of the constraint
     */
    constraintName: string;
    options?: {
      onDelete?: "cascade" | "null" | "restrict" | "no action"; // default no action
      onUpdate?: "cascade" | "null" | "restrict" | "no action"; // default no action
    };
  }): Promise<void> {
    let {
      tableName,
      columnName,
      foreignTableName,
      foreignColumnName,
      options,
    } = foreignKey;
    tableName = this.#toSnake(tableName);
    const formattedCol = this.#formatColumnName(columnName);
    foreignTableName = this.#toSnake(foreignTableName);
    foreignColumnName = this.#formatColumnName(foreignColumnName);
    let query =
      `ALTER TABLE ${this.schema}.${tableName} ADD CONSTRAINT ${foreignKey.constraintName} FOREIGN KEY (${formattedCol}) REFERENCES ${this.schema}.${foreignTableName} (${foreignColumnName})`;
    if (options?.onDelete) {
      switch (options.onDelete) {
        case "cascade":
          query += ` ON DELETE CASCADE`;
          break;
        case "null":
          query += ` ON DELETE SET NULL`;
          break;
        case "restrict":
          query += ` ON DELETE RESTRICT`;
          break;
        case "no action":
          query += ` ON DELETE NO ACTION`;
          break;
      }
    }
    if (options?.onUpdate) {
      switch (options.onUpdate) {
        case "cascade":
          query += ` ON UPDATE CASCADE`;
          break;
        case "null":
          query += ` ON UPDATE SET NULL`;
          break;
        case "restrict":
          query += ` ON UPDATE RESTRICT`;
          break;
        case "no action":
          query += ` ON UPDATE NO ACTION`;
          break;
      }
    }
    query += `;`;

    await this.query(query);
    await this.createIndex({
      tableName,
      indexName: `fki_${foreignKey.constraintName}`,
      columns: [columnName],
    });
  }

  /* End column operations */

  /**
   * Get the constraints for a table: primary key, foreign key, and unique constraints
   */
  async getTableConstraints(
    tableName: string,
  ): Promise<Array<TableConstraint>> {
    tableName = this.#toSnake(tableName);
    const query =
      // `SELECT * FROM information_schema.table_constraints WHERE table_name = '${tableName}' AND table_schema = '${this.schema}'`;
      `SELECT
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = '${tableName}'
        AND tc.table_schema = '${this.schema}'`;
    // AND tc.constraint_type = 'UNIQUE';`;

    const result = await this.query<
      TableConstraint
    >(query);
    return result.rows;
  }
  #makeOrFilter(
    filters: DBFilter,
  ) {
    const filterStrings = this.#makeFilter(filters);
    return filterStrings.join(" OR ");
  }
  #makeAndFilter(
    filters: DBFilter,
  ) {
    const filterStrings = this.#makeFilter(filters);
    return filterStrings.join(" AND ");
  }

  #makeMultiChoiceFieldQuery(
    schema: string,
    parentTableName: string,
    entryType: string,
    fieldName: string,
    parentAlias?: string,
  ): string {
    fieldName = this.#toSnake(fieldName);
    const parentTable = parentAlias ?? `${schema}.${parentTableName}`;
    return `(SELECT string_agg(values.value, ', ')
    FROM (SELECT value FROM ${schema}.${entryType}_${fieldName}_mc_values WHERE parent_id = ${parentTable}.id) AS values) AS ${fieldName}`;
  }
  #makeFilter(
    filters: DBFilter,
  ): string[] {
    const keys = Object.keys(filters);
    if (keys.length === 0) {
      return [];
    }

    const filterStrings = keys.map((key) => {
      let filterString = "";
      const column = this.#formatColumnName(key);

      if (typeof filters[key] === "object") {
        const filter = filters[key] as AdvancedFilter;

        const operator = filter.op;
        const joinList = !(operator === "between" || operator === "notBetween");
        const value = this.#formatValue(filter.value, joinList);
        if (!value) {
          return "";
        }
        switch (operator) {
          case "=":
            filterString = `${column} = ${value}`;
            break;
          case "!=":
            filterString = `${column} != ${value}`;
            break;
          case ">":
            filterString = `${column} > ${value}`;
            break;
          case "<":
            filterString = `${column} < ${value}`;
            break;
          case ">=":
            filterString = `${column} >= ${value}`;
            break;
          case "<=":
            filterString = `${column} <= ${value}`;
            break;
          case "is":
            filterString = `${column} IS ${value}`;
            break;
          case "isNot":
            filterString = `${column} IS NOT ${value}`;
            break;

          case "contains":
            filterString = `${column} ILIKE '%${
              this.#formatValue(filter.value, false, true)
            }%'`;
            break;
          case "notContains":
            filterString = `${column} NOT ILIKE '%${
              this.#formatValue(filter.value, false, true)
            }%'`;
            break;
          case "startsWith":
            filterString = `${column} ILIKE '${
              this.#formatValue(filter.value, false, true)
            }%'`;
            break;
          case "endsWith":
            filterString = `${column} ILIKE '%${
              this.#formatValue(filter.value, false, true)
            }'`;
            break;
          case "isEmpty":
            filterString = `${column} IS NULL`;
            break;
          case "isNotEmpty":
            filterString = `${column} IS NOT NULL`;
            break;
          case "inList":
            filterString = `${column} IN (${value})`;
            break;
          case "notInList":
            filterString = `${column} NOT IN (${value})`;
            break;
          case "equal":
            filterString = `${column} = ${value}`;
            break;
          case "greaterThan":
            filterString = `${column} > ${value}`;
            break;
          case "lessThan":
            filterString = `${column} < ${value}`;
            break;
          case "greaterThanOrEqual":
            filterString = `${column} >= ${value}`;
            break;
          case "lessThanOrEqual":
            filterString = `${column} <= ${value}`;
            break;
          case "between":
            {
              const val = value as string[];
              filterString = `${column} BETWEEN ${val[0]} AND ${val[1]}`;
            }
            break;
          case "notBetween":
            {
              const val = value as string[];
              filterString = `${column} NOT BETWEEN ${val[0]} AND ${val[1]}`;
            }
            break;
          default:
            filterString = `${column} = ${value}`;
            break;
        }
        return filterString;
      }
      return `${column} = ${this.#formatValue(filters[key])}`;
    });

    return filterStrings.filter((filter) => filter !== "");
  }
  /**
   * Format a column name for use in a query. Keywords are escaped with double quotes
   */
  #formatColumnName(column: string): string {
    column = this.#toSnake(column);
    const reservedWords = ["order", "user"];
    if (reservedWords.includes(column)) {
      return `"${column}"`;
    }
    return column;
  }

  /**
   * Convert a camelCase string to snake_case
   */
  #toSnake(value: string): string {
    return camelToSnakeCase(value);
  }
  /**
   * Convert a snake_case string to camelCase
   */
  #snakeToCamel(value: string): string {
    return toCamelCase(value);
  }
  /**
   * Format a value for use in a query
   */
  #formatValue<Join extends boolean>(
    value: any,
    joinList?: Join,
    noQuotes?: boolean,
  ): ValueType<Join> | undefined {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return;
      }
      if (joinList) {
        return value.map((v) => this.#formatValue(v)).join(", ") as ValueType<
          Join
        >;
      }
      return value.map((v) => this.#formatValue(v)) as ValueType<Join>;
    }
    if (value === '"') {
      return '""' as ValueType<Join>;
    }
    if (typeof value === "string") {
      if (value === "") {
        return "''" as ValueType<Join>;
      }
      // escape single quotes

      value = value.replaceAll(/'/g, "''");
      if (noQuotes) {
        return value as ValueType<Join>;
      }
      return `'${value}'` as ValueType<Join>;
    }
    if (value === false) {
      return "false" as ValueType<Join>;
    }
    if (typeof value === "number") {
      return value as ValueType<Join>;
    }
    if (!value) {
      return "null" as ValueType<Join>;
    }
    return value;
  }
}
