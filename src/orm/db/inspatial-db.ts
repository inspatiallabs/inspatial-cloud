import type {
  CountGroupedResult,
  DBConfig,
  DBFilter,
  DBListOptions,
  PgColumnDefinition,
  PgDataTypeDefinition,
  PostgresColumn,
  QueryResultFormatted,
  TableConstraint,
  TableIndex,
} from "#/orm/db/db-types.ts";

import type { IDMode } from "#/orm/field/types.ts";
import type { IDValue } from "#/orm/entry/types.ts";
import { PostgresPool } from "#/orm/db/postgres/pgPool.ts";
import type { PgClientConfig } from "#/orm/db/postgres/pgTypes.ts";
import convertString from "#/utils/convert-string.ts";
import { inLog } from "#/in-log/in-log.ts";
import { makeFilterQuery } from "#/orm/db/filters.ts";
import { formatColumnName, formatDbValue } from "#/orm/db/utils.ts";

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
  #pool: PostgresPool;

  /**
   * The version of the database
   */
  #version: string | undefined;

  #debugMode: boolean = false;
  /**
   * InSpatialDB is an interface for interacting with a Postgres database
   */
  constructor(config: DBConfig) {
    this.config = config;
    if (config.debug) {
      this.#debugMode = true;
      inLog.debug("InSpatialDB debug mode enabled");
    }
    this.dbName = config.connection.database;
    this.schema = config.connection.schema || "public";
    const poolOptions = {
      size: 1,
      maxSize: 1,
      idleTimeout: config.idleTimeout || 5000,
      lazy: true,
    };
    const clientConfig: PgClientConfig = {
      ...config.connection,
      debug: this.#debugMode,
      options: {
        application_name: config.appName || "InSpatial",
      },
    };

    switch (config.clientMode) {
      case "pool":
        this.#pool = new PostgresPool({
          clientConfig: clientConfig,
          pool: {
            ...poolOptions,
            maxSize: 10,
            ...config.poolOptions,
          },
        });
        break;
      case "dev":
        this.#pool = new PostgresPool({
          clientConfig: clientConfig,
          useDev: true,
          pool: poolOptions,
        });
        break;
      case "single":
      default:
        this.#pool = new PostgresPool({
          clientConfig: clientConfig,
          pool: poolOptions,
        });
        break;
    }
  }

  async init(): Promise<void> {
    await this.#pool.initialized();
  }
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
   * Send a query to the database and return the result.
   * The result is formatted to use camelCase for column names
   * @param query The query to send to the database
   */
  async query<T extends Record<string, any> = Record<string, any>>(
    query: string,
  ): Promise<QueryResultFormatted<T>> {
    this.#debugMode && inLog.debug(`Query: ${query}`);
    const result = await this.#pool.query<T>(query);
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
    tableName = toSnake(tableName);
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
    const formattedColumns = columns.map((column) => formatColumnName(column));
    const query = `SELECT ${
      formattedColumns.join(", ")
    } FROM information_schema.columns WHERE table_schema = '${this.schema}' AND table_name = '${tableName}'`;
    const result = await this.query<PostgresColumn>(query);
    return result.rows.map((row) => {
      return {
        ...row,
        columnName: snakeToCamel(row.columnName),
      };
    });
  }

  /**
   * Add a comment to a table
   */
  async addTableComment(tableName: string, comment: string): Promise<void> {
    tableName = toSnake(tableName);
    const query =
      `COMMENT ON TABLE ${this.schema}.${tableName} IS '${comment}'`;
    await this.query(query);
  }

  /**
   * Get the comment for a table
   */
  async getTableComment(tableName: string): Promise<string> {
    tableName = toSnake(tableName);
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
    return result.rows.map((row) => snakeToCamel(row.tableName));
  }

  /**
   * Check if a table exists in the database
   */
  async tableExists(tableName: string): Promise<boolean> {
    tableName = toSnake(tableName);
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
    tableName = toSnake(tableName);
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
    tableName = toSnake(tableName);
    const columnKeys = Object.keys(data);
    const columns = columnKeys.map((key) => {
      return formatColumnName(key);
    });

    const values = columnKeys.map((key) => {
      return formatDbValue(data[key]);
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
    value: unknown,
  ): Promise<T | undefined> {
    tableName = toSnake(tableName);
    value = formatDbValue(value);
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
    tableName = toSnake(tableName);
    const values = Object.entries(data).map(([key, value]) => {
      return `${formatColumnName(key)} = ${formatDbValue(value)}`;
    });
    const idValue = formatDbValue(id);

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
    tableName = toSnake(tableName);
    const query = `DELETE FROM ${this.schema}.${tableName} WHERE id = ${
      formatDbValue(id)
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
    tableName = toSnake(tableName);
    let query = `DELETE FROM ${this.schema}.${tableName}`;
    if (filters) {
      query += " WHERE ";
      query += this.#makeAndFilter(filters);
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
    schema?: string,
  ): Promise<QueryResultFormatted<T> & { totalCount: number }> {
    tableName = toSnake(tableName);
    schema = schema || this.schema;
    if (!options) {
      options = {} as DBListOptions;
    }
    let columns = "*";
    if (options.columns && Array.isArray(options.columns)) {
      columns = options.columns.map((column) => {
        if (typeof column === "object") {
          return this.#makeMultiChoiceFieldQuery(
            schema,
            tableName,
            column.entryType,
            column.key,
          );
        }
        return formatColumnName(column);
      }).join(", ");
    }
    let query = `SELECT ${columns} FROM ${schema}.${tableName}`;
    let countQuery = `SELECT COUNT(*) FROM ${schema}.${tableName}`;
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
      query += ` ORDER BY ${formatColumnName(options.orderBy)}`;
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
      if (countResult.rowCount > 0) {
        totalCount = countResult.rows[0].count;
      }
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
    value: unknown,
    filters: DBFilter,
  ): Promise<void> {
    tableName = toSnake(tableName);
    let query = `UPDATE ${this.schema}.${tableName} SET ${
      formatColumnName(column)
    } = ${formatDbValue(value)}`;
    if (filters) {
      query += " WHERE ";
      query += this.#makeAndFilter(filters);
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
    tableName = toSnake(tableName);
    const query = `SELECT ${
      formatColumnName(column)
    } FROM ${this.schema}.${tableName} WHERE id = ${formatDbValue(id)}`;
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
    tableName = toSnake(tableName);
    let countQuery = `SELECT COUNT(*) FROM ${this.schema}.${tableName}`;
    if (options?.groupBy) {
      countQuery = `SELECT ${
        options.groupBy.map((column) => {
          return formatColumnName(column as string);
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
          return formatColumnName(column as string);
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
    tableName = toSnake(tableName);
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
    const tableNameSnake = toSnake(tableName);

    const fieldsStr = (Array.isArray(columns) ? columns : [columns]).map(
      (column) => formatColumnName(column),
    ).join(", ");
    const includeStr = options.include
      ? `INCLUDE (${
        options.include.map((col) => formatColumnName(col)).join(", ")
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
    tableName = toSnake(tableName);
    const query = `DROP INDEX ${indexName}`;
    await this.query(query);
  }

  /**
   * Check if an index exists on a table
   */
  async hasIndex(tableName: string, indexName: string): Promise<boolean> {
    tableName = toSnake(tableName);
    const query =
      `SELECT indexname FROM pg_indexes WHERE schemaname = '${this.schema}' AND tablename = '${tableName}' AND indexname = '${indexName}'`;
    const result = await this.query<{ indexname: string }>(query);
    return result.rowCount > 0;
  }

  /**
   * Get an index info from a table
   */
  async getIndex(
    tableName: string,
    indexName: string,
  ): Promise<TableIndex | undefined> {
    tableName = toSnake(tableName);
    const query =
      `SELECT * FROM pg_indexes WHERE schemaname = '${this.schema}' AND tablename = '${tableName}' AND indexname = '${indexName}'`;
    const result = await this.query<TableIndex>(query);
    if (result.rowCount === 0) {
      return undefined;
    }
    return result.rows[0];
  }

  async getTableIndexes(tableName: string): Promise<Array<TableIndex>> {
    const query =
      `SELECT * FROM pg_indexes WHERE schemaname = '${this.schema}' AND tablename = '${tableName}'`;
    const result = await this.query<TableIndex>(query);
    return result.rows;
  }
  /**
   * Run a VACUUM ANALYZE on the database or a specific table
   */
  async vacuumAnalyze(tableName?: string): Promise<QueryResultFormatted> {
    if (!tableName) {
      const query = `VACUUM ANALYZE`;
      return await this.query(query);
    }
    tableName = toSnake(tableName);
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
    tableName = toSnake(tableName);
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
      query += ` DEFAULT ${formatDbValue(column.columnDefault)}`;
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
    tableName = toSnake(tableName);
    columnName = formatColumnName(columnName);
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
    tableName = toSnake(tableName);
    columnName = formatColumnName(columnName);
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
    tableName = toSnake(tableName);
    columnName = toSnake(columnName);
    const formattedColumn = formatColumnName(columnName);
    const query =
      `ALTER TABLE ${this.schema}.${tableName} ADD CONSTRAINT ${tableName}_${columnName}_unique UNIQUE (${formattedColumn})`;
    await this.query(query);
  }
  /**
   * Remove a unique constraint from a column
   */
  async removeColumnUnique(
    tableName: string,
    columnName: string,
  ): Promise<void> {
    tableName = toSnake(tableName);
    columnName = toSnake(columnName);
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
    defaultIfNull?: unknown,
  ): Promise<void> {
    tableName = toSnake(tableName);
    columnName = formatColumnName(columnName);
    let query = "";
    if (defaultIfNull !== undefined && !allowNull) {
      query +=
        `ALTER TABLE ${this.schema}.${tableName} ALTER COLUMN ${columnName} SET DEFAULT ${
          formatDbValue(defaultIfNull)
        };`;
      query += `UPDATE ${this.schema}.${tableName} SET ${columnName} = ${
        formatDbValue(defaultIfNull)
      } WHERE ${columnName} IS NULL;`;
    }
    query +=
      `ALTER TABLE ${this.schema}.${tableName} ALTER COLUMN ${columnName} ${
        allowNull ? "DROP NOT NULL" : "SET NOT NULL"
      };`;

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
    tableName = toSnake(tableName);
    const formattedCol = formatColumnName(columnName);
    foreignTableName = toSnake(foreignTableName);
    foreignColumnName = formatColumnName(foreignColumnName);
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
    tableName = toSnake(tableName);
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
    return result.rows.map((row) => {
      return {
        ...row,
        columnName: snakeToCamel(row.columnName),
      };
    });
  }
  #makeOrFilter(
    filters: DBFilter,
  ) {
    const filterStrings = makeFilterQuery(filters);
    return filterStrings.join(" OR ");
  }
  #makeAndFilter(
    filters: DBFilter,
  ) {
    const filterStrings = makeFilterQuery(filters);
    return filterStrings.join(" AND ");
  }

  #makeMultiChoiceFieldQuery(
    schema: string,
    parentTableName: string,
    entryType: string,
    fieldName: string,
    parentAlias?: string,
  ): string {
    fieldName = toSnake(fieldName);
    const parentTable = parentAlias ?? `${schema}.${parentTableName}`;
    return `(SELECT string_agg(values.value, ', ')
    FROM (SELECT value FROM ${schema}.${entryType}_${fieldName}_mc_values WHERE parent_id = ${parentTable}.id) AS values) AS ${fieldName}`;
  }

  /**
   * Format a value for use in a query
   */
}

function toSnake(value: string) {
  return convertString(value, "snake", true);
}

function snakeToCamel(value: string) {
  return convertString(value, "camel");
}
