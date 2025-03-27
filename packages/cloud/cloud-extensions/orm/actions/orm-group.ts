import { CloudAction, CloudActionGroup } from "#/cloud-action.ts";

const migrateAction = new CloudAction("migrate", {
  label: "Migrate Database",
  description: "Run Database Migrations",
  async run({ app }) {
    return await app.orm.migrate();
  },
  params: [],
});
const planMigrationAction = new CloudAction("planMigration", {
  description: "Generate Migration Plan",
  label: "Plan Migration",
  async run({ app }) {
    return await app.orm.planMigration();
  },
  params: [],
});
const entryTypesInfo = new CloudAction("entryTypes", {
  description: "Get EntryType Definitions",
  label: "Entry Types",
  run({ app }) {
    return Array.from(
      app.orm.entryTypes.values().map((entryType) => entryType.info),
    );
  },
  params: [],
});

const settingsTypesInfo = new CloudAction("settingsTypes", {
  description: "Get SettingsType Definitions",
  label: "Settings Types",
  run({ app }) {
    return Array.from(
      app.orm.settingsTypes.values().map((settingsType) => settingsType.info),
    );
  },
  params: [],
});

const generateInterfaces = new CloudAction("generateInterfaces", {
  description: "Generate Entry Typescript Interfaces",
  label: "Generate Interfaces",
  run({ app }) {
    return app.orm.generateInterfaces();
  },
  params: [],
});

const ormGroup = new CloudActionGroup("orm", {
  description: "ORM related actions",
  label: "ORM",
  actions: [
    planMigrationAction,
    migrateAction,
    entryTypesInfo,
    settingsTypesInfo,
    generateInterfaces,
  ],
});

export default ormGroup;
