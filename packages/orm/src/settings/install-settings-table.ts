import { InSpatialORM } from "#/inspatial-orm.ts";
import { PgColumnDefinition } from "#db/types.ts";

export async function installSettingsTable(orm: InSpatialORM) {
  const { db } = orm;
  const hasTable = await db.tableExists("inSettings");
  if (!hasTable) {
    await db.createTable("inSettings", "manual");
  }

  const columns: Array<PgColumnDefinition> = [{
    columnName: "settingsType",
    dataType: "character varying",
    characterMaximumLength: 255,
    isNullable: "NO",
  }, {
    columnName: "field",
    dataType: "character varying",
    characterMaximumLength: 255,
    isNullable: "NO",
  }, {
    columnName: "value",
    dataType: "jsonb",
    isNullable: "NO",
  }];

  const existingColumns = await db.getTableColumns("inSettings");
  const existingColumnsMap = new Map(
    existingColumns.map((c) => [c.columnName, c]),
  );
  for (const column of columns) {
    const existingColumn = existingColumnsMap.get(column.columnName);
    if (existingColumn) {
      if (existingColumn.dataType !== column.dataType) {
        await db.changeColumnDataType("inSettings", column.columnName, {
          dataType: column.dataType,
          characterMaximumLength: column.characterMaximumLength,
        });
      }
      continue;
    }
    await db.addColumn("inSettings", column);
  }
  const hasIndex = await db.hasIndex("inSettings", "in_settings_settings_type");
  if (!hasIndex) {
    await db.createIndex({
      tableName: "inSettings",
      columns: ["settingsType"],
      indexName: "in_settings_settings_type",
    });
  }
}
