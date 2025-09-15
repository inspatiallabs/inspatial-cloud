import type { PgPoolConfig } from "~/orm/db/postgres/pgTypes.ts";
import type { EntryMap, EntryName } from "#types/models.ts";

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

export interface DBConnectionConfigDev extends DBConnectionConfig {
  connectionType: "dev";
  host: string;
  port: number;
}

export interface DBConnectionConfigSocket extends DBConnectionConfig {
  connectionType: "socket";
  socketPath: string;
}

export type ClientConnectionType =
  | DBConnectionConfigTCP
  | DBConnectionConfigSocket
  | DBConnectionConfigDev;

export interface DBConfig {
  debug?: boolean;
  connection: ClientConnectionType;
  appName?: string;
  idleTimeout?: number;
  clientMode?: "pool" | "single" | "dev";
  poolOptions?: PgPoolConfig["pool"];
}

export type PgDataType =
  | "boolean"
  | "text"
  | "text[]"
  | "character varying"
  | "timestamp with time zone"
  | "integer"
  | "integer[]"
  | "jsonb"
  | "numeric"
  | "bigint"
  | "time"
  | "money"
  | "date";
export interface PgDataTypeDefinition {
  dataType: PgDataType;
  array?: boolean;
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
export interface TableIndex {
  schemaname: string;
  tablename: string;
  indexname: string;
  tablespace: string | null;
  indexdef: string;
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
  /**
   * The name of the table
   */
  tableName: string;
  columnName: string;
  foreignTableName: string;
  constraintName: string;
  foreignColumnName: string;
  global?: boolean;
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

type BaseKeys = "id" | "createdAt" | "updatedAt";
export interface ListOptions<E extends EntryName = EntryName> {
  columns?: (keyof EntryMap[E]["__fields__"] | BaseKeys)[];
  filter?: DBFilter;
  limit?: number;
  orFilter?: DBFilter;
  offset?: number;
  orderBy?: string;
  order?: "asc" | "desc";
  groupBy?: string | Array<string>;
}

export type DBFilter =
  | Array<
    InFilter
  >
  | Record<string, string | number | null | boolean>;

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

// Filters

type EqualsOp = "=" | "equal" | "!=" | "notEqual";
type ComparisonOp =
  | "<"
  | "<="
  | ">"
  | ">="
  | "lessThanOrEqual"
  | "lessThan"
  | "greaterThan"
  | "greaterThanOrEqual";
type BetweenOps = "between" | "notBetween";
type EmptyOps = "isEmpty" | "isNotEmpty";
type ListOps = "notInList" | "inList";
type ContainsOps = "contains" | "notContains" | "startsWith" | "endsWith";

type ArrayOps = "arrayContains" | "arrayNotContains" | "arrayContainsAny";

export type FilterOps =
  | EqualsOp
  | ComparisonOp
  | BetweenOps
  | EmptyOps
  | ListOps
  | ContainsOps
  | ArrayOps;

type FilterInList = {
  op: ListOps;
  value: Array<string> | Array<number>;
};

type FilterEqual = {
  op: EqualsOp;
  value: string | number | boolean;
};
type FilterBetween = {
  op: BetweenOps;
  value: [string, string] | [number, number];
};

type FilterEmpty = {
  op: EmptyOps;
};
type FilterCompare = {
  op: ComparisonOp;
  value: string | number;
};

type FilterContains = {
  op: ContainsOps;
  value: string;
  caseSensitive?: boolean;
};

type FilterArray = {
  op: ArrayOps;
  value: string | number | Array<string> | Array<number>;
};
export type FilterAll =
  | FilterInList
  | FilterEqual
  | FilterBetween
  | FilterEmpty
  | FilterCompare
  | FilterContains
  | FilterArray;

export type InFilter =
  | FilterAll
    & {
      field: string;
      or?: Array<FilterAll>;
      and?: Array<FilterAll>;
    }
  | {
    field: string;
    or?: Array<FilterAll>;
    and?: Array<FilterAll>;
  };
