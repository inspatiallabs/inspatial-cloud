import type { PgPoolConfig } from "#/orm/db/postgres/pgTypes.ts";

interface DBConnectionConfig {
  user: string;
  database: string;
  schema?: string;

  password?: string;
}

export interface DBConnectionConfigTCP extends DBConnectionConfig {
  connectionType: "tcp";
  host: string;
  port: number;
}

export interface DBConnectionConfigSocket extends DBConnectionConfig {
  connectionType: "socket";
  socketPath: string;
}

export type ClientConnectionType =
  | DBConnectionConfigTCP
  | DBConnectionConfigSocket;

export interface DBConfig {
  connection: ClientConnectionType;
  appName?: string;
  idleTimeout?: number;
  clientMode?: "pool" | "single";
  poolOptions?: PgPoolConfig["pool"];
}

export type PgDataType =
  | "boolean"
  | "text"
  | "character varying"
  | "timestamp with time zone"
  | "integer"
  | "jsonb"
  | "numeric"
  | "bigint"
  | "date";
export interface PgDataTypeDefinition {
  dataType: PgDataType;
  characterMaximumLength?: number | null;
  characterOctetLength?: number | null;
  numericPrecision?: number | null;
  numericPrecisionRadix?: number | null;
  numericScale?: number | null;
  datetimePrecision?: number | null;
  intervalType?: string;
  intervalPrecision?: number;
}
export interface PgColumnDefinition extends PgDataTypeDefinition {
  columnName: string;
  columnDefault?: any | null;
  isNullable?: "YES" | "NO";
  unique?: boolean;
  isIdentity?: boolean;
}

export interface TableConstraint {
  constraintSchema: string;
  constraintName: string;
  columnName: string;
  tableSchema: string;
  tableName: string;
  constraintType: "CHECK" | "FOREIGN KEY" | "PRIMARY KEY" | "UNIQUE";
  isDeferrable: "YES" | "NO";
  initiallyDeferred: "YES" | "NO";
  enforced: "YES" | "NO";
  nullsDistinct: null;
}
export interface ForeignKeyConstraint {
  tableName: string;
  columnName: string;
  foreignTableName: string;
  constraintName: string;
  foreignColumnName: string;
}
export interface PostgresColumn extends PgDataTypeDefinition {
  tableCatalog: string;
  tableSchema: string;
  tableName: string;
  columnName: string;
  ordinalPosition: number;
  columnDefault: any | null;
  isNullable: "YES" | "NO";
  udtCatalog: string;
  udtSchema: string;
  udtName: string;
  isIdentity: "YES" | "NO";
}

export interface DBColumn {
  name: string;
  type: string;
  nullable: boolean;
  default: any;
  primaryKey: boolean;
  unique: boolean;
}

export interface QueryResultFormatted<T = Record<string, any>> {
  rowCount: number;
  rows: T[];
  columns: string[];
}

export type ValueType<Join> = Join extends false ? Array<string>
  : string | number;
export interface AdvancedFilter {
  op:
    | "contains"
    | "notContains"
    | "inList"
    | "notInList"
    | "between"
    | "notBetween"
    | "is"
    | "isNot"
    | "isEmpty"
    | "isNotEmpty"
    | "startsWith"
    | "endsWith"
    | "greaterThan"
    | "lessThan"
    | "greaterThanOrEqual"
    | "lessThanOrEqual"
    | "equal"
    | ">"
    | "<"
    | ">="
    | "<="
    | "="
    | "!=";
  value: any;
}

export interface ListOptions {
  columns?: string[];
  filter?: DBFilter;
  orFilter?: DBFilter;
  limit?: number;
  offset?: number;
  orderBy?: string;
  order?: "asc" | "desc";
}

export type DBFilter = Record<
  string,
  string | number | boolean | null | AdvancedFilter
>;

export interface DBListOptions {
  columns?:
    | Array<
      string | {
        key: string;
        entryType: string;
        type: "multiChoice";
      }
    >
    | "*";
  filter?: DBFilter;
  orFilter?: DBFilter;
  limit?: number;
  offset?: number;
  orderBy?: string;
  order?: "asc" | "desc";
}

export type CountGroupedResult<K extends string | Array<PropertyKey>> =
  K extends Array<string> ? { [key in K[number]]: string }
    : K extends string ? Record<K, string>
    : never;

type DBColumnType =
  | "BOOLEAN"
  | "DATE"
  | "INTEGER"
  | "BIGINT"
  | "DECIMAL"
  | "VARCHAR(255)"
  | "JSONB"
  | "TEXT"
  | "TIMESTAMP WITH TIME ZONE"
  | "TIMESTAMP WITHOUT TIME ZONE";
