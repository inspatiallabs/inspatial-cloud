import { CloudAPIAction } from "#/api/cloud-action.ts";
import { CloudAPIGroup } from "#/api/cloud-group.ts";
import type { MigrationPlan } from "#/orm/migrate/migration-plan.ts";
import type { SettingsTypeInfo } from "#/orm/settings/types.ts";
import type { EntryTypeInfo } from "#/orm/entry/types.ts";

const migrateAction = new CloudAPIAction("migrate", {
  label: "Migrate Database",
  description: "Run Database Migrations",
  async run({ app }): Promise<Array<string>> {
    return await app.orm.migrate();
  },
  params: [],
});
const planMigrationAction = new CloudAPIAction("planMigration", {
  description: "Generate Migration Plan",
  label: "Plan Migration",
  async run({ app }): Promise<MigrationPlan> {
    return await app.orm.planMigration();
  },
  params: [],
});
const entryTypesInfo = new CloudAPIAction("entryTypes", {
  description: "Get EntryType Definitions",
  label: "Entry Types",
  run({ app }): Array<EntryTypeInfo> {
    return Array.from(
      app.orm.entryTypes.values().map((entryType) => entryType.info),
    ) as Array<EntryTypeInfo>;
  },
  params: [],
});

const settingsTypesInfo = new CloudAPIAction("settingsTypes", {
  description: "Get SettingsType Definitions",
  label: "Settings Types",
  run({ app }): Array<SettingsTypeInfo> {
    return Array.from(
      app.orm.settingsTypes.values().map((settingsType) => settingsType.info),
    ) as Array<SettingsTypeInfo>;
  },
  params: [],
});

const generateInterfaces = new CloudAPIAction("generateInterfaces", {
  description: "Generate Entry Typescript Interfaces",
  label: "Generate Interfaces",
  async run({ app }): Promise<{
    generatedEntries: Array<string>;
    generatedSettings: Array<string>;
  }> {
    return await app.orm.generateInterfaces();
  },
  params: [],
});

const ormGroup = new CloudAPIGroup("orm", {
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
