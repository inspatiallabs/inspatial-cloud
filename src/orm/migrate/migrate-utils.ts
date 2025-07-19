import type {
  PgColumnDefinition,
  PgDataTypeDefinition,
  PostgresColumn,
} from "~/orm/db/db-types.ts";
export function compareDataTypes(
  existing: PostgresColumn,
  newColumn: PgColumnDefinition,
): {
  from: PgDataTypeDefinition;
  to: PgDataTypeDefinition;
} | undefined {
  const properties: Array<keyof PgDataTypeDefinition> = [
    "dataType",
    "characterMaximumLength",
    "characterOctetLength",
    "numericPrecision",
    "numericPrecisionRadix",
    "numericScale",
    "datetimePrecision",
    "intervalType",
    "intervalPrecision",
  ];
  const from: Record<string, any> = {};
  const to: Record<string, any> = {};
  let hasChanges = false;
  for (const property of properties) {
    if (property in newColumn && existing[property] !== newColumn[property]) {
      hasChanges = true;
      from[property] = existing[property];
      to[property] = newColumn[property];
    }
  }

  if (!hasChanges) {
    return;
  }
  if ("characterMaximumLength" in to && !("dataType" in to)) {
    (to as PgDataTypeDefinition)["dataType"] = "character varying";
  }
  if ("numericPrecision" in to && !("dataType" in to)) {
    (to as PgDataTypeDefinition)["dataType"] = "numeric";
  }
  if ("numericScale" in to && !("dataType" in to)) {
    (to as PgDataTypeDefinition)["dataType"] = "numeric";
  }
  return {
    from: from as PgDataTypeDefinition,
    to: to as PgDataTypeDefinition,
  };
}
export function compareNullable(
  existing: PostgresColumn,
  newColumn: PgColumnDefinition,
): {
  from: PgColumnDefinition["isNullable"];
  to: PgColumnDefinition["isNullable"];
  defaultValue?: PgColumnDefinition["columnDefault"];
} | undefined {
  if (existing.isNullable === newColumn.isNullable) {
    return;
  }

  return {
    from: existing.isNullable,
    to: newColumn.isNullable,
    defaultValue: newColumn.columnDefault,
  };
}
