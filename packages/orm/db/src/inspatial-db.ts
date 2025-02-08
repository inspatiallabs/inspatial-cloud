import type {
  AdvancedFilter,
  CountGroupedResult,
  DBConfig,
  DBFilter,
  DBListOptions,
  PostgresColumn,
  QueryResultFormatted,
  ValueType,
} from "#db/types.ts";
import { PostgresClient } from "#db/postgres/pgClient.ts";
import type { ColumnType } from "#db/postgres/pgTypes.ts";

import { camelToSnakeCase, toCamelCase } from "#db/utils.ts";

export class InSpatialDB {
  config: DBConfig;
  dbName: string;
  schema: string;

  #client?: PostgresClient;

  #version: string | undefined;

  async version(): Promise<any> {
    if (!this.#version) {
      const response = await this.query<{ version: string }>(
        "SELECT version();",
      );
      this.#version = response.rows[0].version;
    }
    return this.#version;
  }

  get client() {
    if (!this.#client) {
      this.#client = new PostgresClient(this.config.connection);
    }

    return this.#client;
  }

  async #query<T extends Record<string, any>>(
    query: string,
  ) {
    const client = this.client;
    if (!client.connected) {
      try {
        await client.connect();
      } catch (e) {
        console.warn(`Error connecting to database: ${e}`);
        throw e;
      }
    }
    return client.query<T>(query);
  }

  constructor(config: DBConfig) {
    this.config = config;
    this.dbName = config.connection.database;
    this.schema = config.connection.schema || "public";
  }

  async query<T extends Record<string, any> = Record<string, any>>(
    query: string,
  ): Promise<QueryResultFormatted<T>> {
    const result = await this.#query<T>(query);
    const columns = result.columns.map((column) => column.camelName);
    return {
      rowCount: result.rowCount,
      rows: result.rows,
      columns,
    };
  }
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
  async addColumn(
    tableName: string,
    columnName: string,
    columnType: ColumnType,
    options?: {
      unique?: boolean;
    },
  ): Promise<void> {
    tableName = this.#toSnake(tableName);
    columnName = camelToSnakeCase(columnName);

    let query = `ALTER TABLE ${this.schema}.${tableName} ADD "${columnName}"`;

    switch (columnType.type) {
      case "varchar":
        query += ` VARCHAR`;
        if (columnType.length) {
          query += `(${columnType.length})`;
        }
        break;
      case "text":
        query += ` TEXT`;
        break;
      case "bool":
        query += ` BOOLEAN`;
        break;
      case "int":
        query += ` INTEGER`;
        break;
      case "float":
        query += ` FLOAT`;
        if (columnType.precision) {
          query += `(${columnType.precision})`;
        }
        break;
      case "numeric":
        query += ` NUMERIC`;
        if (columnType.precision) {
          query += `(${columnType.precision}`;
          if (columnType.scale) {
            query += `, ${columnType.scale}`;
          }
          query += ")";
        }
        break;
      case "json":
        query += ` JSON`;
        break;
      case "jsonb":
        query += ` JSONB`;
        break;
      case "date":
        query += ` DATE`;
        break;
      case "timestamp":
        query += ` TIMESTAMP`;
        break;
      case "timestamptz":
        query += ` TIMESTAMP WITH TIME ZONE`;
        break;
      default:
        query += ` TEXT`;
        break;
    }
    // return query;
    await this.query(query);
    if (options?.unique) {
      await this.makeColumnUnique(tableName, columnName);
    }

    await this.removeColumnUnique(tableName, columnName);
  }

  async getTableNames(): Promise<string[]> {
    const query =
      `SELECT table_name FROM information_schema.tables WHERE table_schema = '${this.schema}'`;
    const result = await this.query<{ tableName: string }>(query);
    return result.rows.map((row) => this.#snakeToCamel(row.tableName));
  }

  async tableExists(tableName: string): Promise<boolean> {
    tableName = this.#toSnake(tableName);
    const query =
      `SELECT table_name FROM information_schema.tables WHERE table_schema = '${this.schema}' AND table_name = '${tableName}'`;
    const result = await this.query<{ tableName: string }>(query);
    return result.rowCount > 0;
  }

  async createTable(
    tableName: string,
  ): Promise<void> {
    tableName = this.#toSnake(tableName);
    const query = `CREATE TABLE IF NOT EXISTS ${this.schema}.${tableName} (
      id VARCHAR(16) PRIMARY KEY
    )`;
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
  ): Promise<QueryResultFormatted<T>> {
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
    return await this.query<T>(query);
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
  ) {
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
  async deleteRow(tableName: string, id: string): Promise<void> {
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

  async batchUpdateField(
    tableName: string,
    field: string,
    value: any,
    filters: Record<string, any>,
  ): Promise<void> {
    tableName = this.#toSnake(tableName);
    let query = `UPDATE ${this.schema}.${tableName} SET ${
      this.#formatColumnName(field)
    } = ${this.#formatValue(value)}`;
    if (filters) {
      query += " WHERE ";
      query += this.#makeFilter(filters);
    }
    await this.query(query);
  }
  async getValue<T>(
    tableName: string,
    id: string,
    field: string,
  ): Promise<T | undefined> {
    tableName = this.#toSnake(tableName);
    const query = `SELECT ${
      this.#formatColumnName(field)
    } FROM ${this.schema}.${tableName} WHERE id = ${this.#formatValue(id)}`;
    const result = await this.query<Record<string, T>>(query);
    if (result.rowCount === 0) {
      return undefined;
    }
    return result.rows[0][field];
  }
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
  dropTable(tableName: string): Promise<void> {
    tableName = this.#toSnake(tableName);
    throw new Error(`dropTable not implemented for postgres`);
  }
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

  async dropIndex(tableName: string, indexName: string): Promise<void> {
    tableName = this.#toSnake(tableName);
    const query = `DROP INDEX ${indexName}`;
    await this.query(query);
  }

  async vacuumAnalyze(tableName?: string) {
    if (!tableName) {
      const query = `VACUUM ANALYZE`;
      return await this.query(query);
    }
    tableName = this.#toSnake(tableName);
    const query = `VACUUM ANALYZE ${this.schema}.${tableName}`;
    return await this.query(query);
  }
  async makeColumnUnique(tableName: string, columnName: string): Promise<void> {
    tableName = this.#toSnake(tableName);
    const query =
      `ALTER TABLE ${this.schema}.${tableName} ADD CONSTRAINT ${tableName}_${columnName}_unique UNIQUE (${columnName})`;
    await this.query(query);
  }

  async removeColumnUnique(
    tableName: string,
    columnName: string,
  ): Promise<void> {
    tableName = this.#toSnake(tableName);
    const query =
      `ALTER TABLE ${this.schema}.${tableName} DROP CONSTRAINT IF EXISTS ${tableName}_${columnName}_unique`;
    await this.query(query);
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

  #formatColumnName(column: string): string {
    column = this.#toSnake(column);
    const reservedWords = ["order", "user"];
    if (reservedWords.includes(column)) {
      return `"${column}"`;
    }
    return column;
  }
  #toSnake(value: string): string {
    return camelToSnakeCase(value);
  }
  #snakeToCamel(value: string): string {
    return toCamelCase(value);
  }
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
