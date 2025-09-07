import type { ValueType } from "~/orm/db/db-types.ts";
import convertString from "~/utils/convert-string.ts";
/**
 * Format a column name for use in a query. Keywords are escaped with double quotes
 */
export function formatColumnName(column: string): string {
  column = toSnake(column);
  const reservedWords = [
    "order",
    "user",
    "primary",
    "group",
    "table",
    "column",
    "to",
    "unique",
    "create",
  ];
  if (reservedWords.includes(column)) {
    return `"${column}"`;
  }
  if (column.endsWith("#")) {
    return `"${column}"`;
  }

  return column;
}
/**
 * Format a value for use in a query
 */
export function formatDbValue<Join extends boolean>(
  value: any,
  joinList?: Join,
  noQuotes?: boolean,
): ValueType<Join> | undefined {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return;
    }
    if (joinList) {
      return value.map((v) => formatDbValue(v)).join(", ") as ValueType<
        Join
      >;
    }
    return value.map((v) => formatDbValue(v)) as ValueType<Join>;
  }
  if (value === '"') {
    return '""' as ValueType<Join>;
  }
  switch (typeof value) {
    case "string":
      if (value === "") {
        return "''" as ValueType<Join>;
      }
      // escape single quotes

      value = value.replaceAll(/'/g, "''");
      if (noQuotes) {
        return value as ValueType<Join>;
      }
      return `'${value}'` as ValueType<Join>;
    case "number":
    case "bigint":
      if (Number.isNaN(value)) {
        return "null" as ValueType<Join>;
      }
      return value as ValueType<Join>;
    case "boolean":
      if (value === true) {
        return "true" as ValueType<Join>;
      }
      if (value === false) {
        return "false" as ValueType<Join>;
      }
      return "null" as ValueType<Join>;
    case "undefined":
      return "null" as ValueType<Join>;
    case "object":
      if (value === null) {
        return "null" as ValueType<Join>;
      }
      try {
        return `'${JSON.stringify(value).replaceAll(/'/g, "''") as ValueType<
          Join
        >}'` as ValueType<
          Join
        >;
      } catch (_e) {
        // no-op, fall through to default case
      }
      break;
    default:
      return value;
  }
}

function toSnake(value: string) {
  return convertString(value, "snake", true);
}
