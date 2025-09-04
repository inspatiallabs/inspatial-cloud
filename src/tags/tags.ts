import type { InSpatialDB } from "../orm/db/inspatial-db.ts";

export async function setupTagsTable(db: InSpatialDB) {
  await db.createTable("inTag", "auto");
  const columns = await db.getTableColumns("inTag");
  if (columns.find((c) => c.columnName === "name")) {
    return;
  }
  await db.addColumn("inTag", {
    columnName: "name",
    dataType: "character varying",
    characterMaximumLength: 255,
    isNullable: "NO",
    unique: true,
  });
}
