import { AppExtension } from "#/app-extension.ts";
import { AppAction, AppActionGroup } from "#/app-action.ts";

const migrateAction = new AppAction("migrate", {
  async run({ app }) {
    return await app.orm.migrate();
  },
  params: [],
});
const planMigrationAction = new AppAction("planMigration", {
  async run({ app }) {
    return await app.orm.planMigration();
  },
  params: [],
});
const entryTypesInfo = new AppAction("entryTypes", {
  description: "Get EntryType Definitions",
  run({ app }) {
    const entryTypes = Array.from(app.orm.entryTypes.values());
    return entryTypes.map((entryType) => entryType.info);
  },
  params: [],
});

const ormGroup = new AppActionGroup("orm", {
  description: "ORM Actions",
  actions: [planMigrationAction, migrateAction, entryTypesInfo],
});
export const ormExtension = new AppExtension({
  key: "orm",
  description: "ORM Extension",
  install(app) {},
  title: "ORM Extension",
  version: "0.0.1",
  actionGroups: [ormGroup],
});
