import type { ClientConnectionType } from "~/orm/db/db-types.ts";

export interface ConnectionOptions {
  // deno-lint-ignore camelcase
  application_name?: string;
  // deno-lint-ignore camelcase
  client_encoding?: string;
  // deno-lint-ignore camelcase
  idle_session_timeout?: number;
  lc_monetary?: "en_US.UTF-8" | "en_GB.UTF-8";
  dateStyle?: string;
  TimeZone?: string;
}

export type PgClientConfig = ClientConnectionType & {
  options?: ConnectionOptions;
  debug?: boolean;
  /** The path where the postgres data should be stored when in dev mode */
  pgDataRoot?: string;
};

export interface PgPoolConfig {
  clientConfig: PgClientConfig;
  useDev?: boolean;
  pool: {
    size: number;
    lazy: boolean;
    maxSize: number;
    idleTimeout: number;
  };
}
export interface DataTypeMap {
  16: "bool";
  17: "bytea";
  18: "char";
  19: "name";
  20: "int8";
  21: "int2";
  22: "int2vector";
  23: "int4";
  24: "regproc";
  25: "text";
  26: "oid";
  27: "tid";
  28: "xid";
  29: "cid";
  30: "oidvector";
  114: "json";
  142: "xml";
  1042: "bpchar";
  1043: "varchar";
  1082: "date";
  1083: "time";
  1114: "timestamp";
  1184: "timestamptz";
  1700: "numeric";
  3802: "jsonb";
}
export interface ColumnDescription {
  name: string;
  camelName: string;
  tableID: number;
  columnID: number;

  dataTypeID: number;
  dataType: DataTypeMap[keyof DataTypeMap] | "unknown";
  dataTypeSize: number;
  dataTypeModifier: number;
  format: number;
}
export type QueryResponse<T extends Record<string, any> = Record<string, any>> =
  {
    rows: T[];
    rowCount: number;
    columns: ColumnDescription[];
  };
export type ClientMessageType =
  | "Q"
  | "X"
  | "B"
  | "C"
  | "f"
  | "D"
  | "E"
  | "H"
  | "F"
  | "p"
  | "P";
export type ServerMessageType = "S" | "R" | "Z" | "E" | "K";

export type ServerStatus =
  | "idle"
  | "transaction"
  | "error"
  | "notConnected"
  | "keyData"
  | "unknown";
export type SimpleQueryResponseType =
  | "CommandComplete"
  | "CopyInResponse"
  | "CopyOutResponse"
  | "RowDescription"
  | "DataRow"
  | "EmptyQueryResponse"
  | "ErrorResponse"
  | "ReadyForQuery"
  | "NoticeResponse";

export type SimpleQueryResponse = {
  "C": "CommandComplete";
  "G": "CopyInResponse";
  "H": "CopyOutResponse";
  "T": "RowDescription";
  "D": "DataRow";
  "I": "EmptyQueryResponse";
  "E": "ErrorResponse";
  "Z": "ReadyForQuery";
  "N": "NoticeResponse";
  "1": "ParseComplete";
  "3": "CloseComplete";
  "\x00": "Blank";
};

export const QR_TYPE = {
  COMMAND_COMPLETE: "C",
  COPY_IN_RESPONSE: "G",
  COPY_OUT_RESPONSE: "H",
  ROW_DESCRIPTION: "T",
  DATA_ROW: "D",
  EMPTY_QUERY_RESPONSE: "I",
  ERROR_RESPONSE: "E",
  READY_FOR_QUERY: "Z",
  NOTICE_RESPONSE: "N",
  PARSE_COMPLETE: "1",
  CLOSE_COMPLETE: "3",
  BLANK: "\x00",
} as const;

export const STATUS_MAP = {
  IDLE: "I",
  TRANSACTION: "T",
  ERROR: "E",
  KEY_DATA: "K",
} as const;

type VarChar = {
  type: "varchar";
  length: number;
};

type Int = {
  type: "int";
};

type Bool = {
  type: "bool";
};

type JSON = {
  type: "json";
};

type JSONB = {
  type: "jsonb";
};

type TEXT = {
  type: "text";
};

type Date = {
  type: "date";
};

type Timestamp = {
  type: "timestamp";
};

type TimestampTZ = {
  type: "timestamptz";
};

type Numeric = {
  type: "numeric";
  precision?: number;
  scale?: number;
};

type Float = {
  type: "float";
  precision?: number;
};

export type ColumnType =
  | VarChar
  | Int
  | Bool
  | JSON
  | JSONB
  | Date
  | Timestamp
  | TimestampTZ
  | Numeric
  | TEXT
  | Float;
