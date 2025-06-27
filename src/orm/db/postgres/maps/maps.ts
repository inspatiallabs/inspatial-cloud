import type { DataTypeMap, ServerStatus } from "~/orm/db/postgres/pgTypes.ts";

export const dataTypeMap: DataTypeMap = {
  16: "bool",
  17: "bytea",
  18: "char",
  19: "name",
  20: "int8",
  21: "int2",
  22: "int2vector",
  23: "int4",
  24: "regproc",
  25: "text",
  26: "oid",
  27: "tid",
  28: "xid",
  29: "cid",
  30: "oidvector",
  114: "json",
  142: "xml",
  1043: "varchar",
  1114: "timestamp",
  1184: "timestamptz",
  1082: "date",
  1700: "numeric",
  3802: "jsonb",
};

export const statusMap: Record<any, ServerStatus> = {
  "I": "idle",
  "T": "transaction",
  "E": "error",
  "K": "keyData",
};
export function getDataType(
  dataTypeID: number,
): DataTypeMap[keyof DataTypeMap] | "unknown" {
  const id = dataTypeID as keyof DataTypeMap;

  if (dataTypeMap[id]) {
    return dataTypeMap[id];
  }
  return "unknown";
}

function _stripNulls(data: Uint8Array) {
  let i = data.length - 1;
  while (data[i] === 0) {
    i--;
  }
  return data.slice(0, i + 1);
}
function decodeText(data: Uint8Array) {
  return new TextDecoder().decode(data);
}
export function convertToDataType(
  data: Uint8Array,
  _type: number,
  dataType: DataTypeMap[keyof DataTypeMap] | "unknown",
): any {
  // data = stripNulls(data);
  const text = decodeText(data);

  switch (dataType) {
    case "bool":
      return text === "t";
    case "int2":
      return parseInt(text);
    case "int4":
      return parseInt(text);
    case "int8":
      return parseInt(text);
    case "xml":
      return JSON.parse(text);
    case "timestamptz":
      return new Date(text).getTime();
    case "timestamp":
      return new Date(text).getTime();
    case "varchar":
      return text;
    case "text":
      return text;
    case "date":
      return text;
    case "numeric":
      return parseFloat(text);
    case "jsonb":
      return JSON.parse(text);
    case "json":
      return JSON.parse(text);
    default:
      return text;
  }
}
