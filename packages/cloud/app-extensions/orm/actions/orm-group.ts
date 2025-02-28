import { CloudAction, CloudActionGroup } from "#/cloud-action.ts";

const migrateAction = new CloudAction("migrate", {
  async run({ app }) {
    return await app.orm.migrate();
  },
  params: [],
});
const planMigrationAction = new CloudAction("planMigration", {
  async run({ app }) {
    return await app.orm.planMigration();
  },
  params: [],
});
const entryTypesInfo = new CloudAction("entryTypes", {
  description: "Get EntryType Definitions",
  run({ app }) {
    const entryTypes = Array.from(app.orm.entryTypes.values());
    return entryTypes.map((entryType) => entryType.info);
  },
  params: [],
});

const generateInterfaces = new CloudAction("generateInterfaces", {
  description: "Generate Entry Typescript Interfaces",
  run({ app }) {
    return app.orm.generateInterfaces();
  },
  params: [],
});

const ormGroup = new CloudActionGroup("orm", {
  description: "ORM Actions",
  actions: [
    planMigrationAction,
    migrateAction,
    entryTypesInfo,
    generateInterfaces,
  ],
});

export default ormGroup;
