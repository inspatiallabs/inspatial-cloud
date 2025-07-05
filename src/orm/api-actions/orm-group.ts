import { CloudAPIAction } from "~/api/cloud-action.ts";
import type { MigrationPlan } from "~/orm/migrate/migration-plan.ts";
import type { SettingsTypeInfo } from "~/orm/settings/types.ts";
import type { EntryTypeInfo } from "~/orm/entry/types.ts";
import type { SessionData } from "~/auth/types.ts";

export const migrateAction = new CloudAPIAction("migrate", {
  label: "Migrate Database",
  description: "Run Database Migrations",
  run({ orm }) {
    return {
      message: "not implemented",
    };
    // return await orm.migrate();
  },
  params: [],
});

export const planMigrationAction = new CloudAPIAction("planMigration", {
  description: "Generate Migration Plan",
  label: "Plan Migration",
  async run({ orm }): Promise<MigrationPlan> {
    return await orm.planMigration();
  },
  params: [],
});

export const entryTypesInfo = new CloudAPIAction("entryTypes", {
  description: "Get EntryType Definitions",
  label: "Entry Types",
  run({ inCloud, inRequest }): Array<EntryTypeInfo> {
    const user = inRequest.context.get<SessionData>("user");
    if (!user) {
      return [];
    }
    const role = inCloud.roles.getRole(user.role);
    return Array.from(
      role.entryTypes.values().map((entryType) => entryType.info),
    ) as Array<EntryTypeInfo>;
  },
  params: [],
});

export const settingsTypesInfo = new CloudAPIAction("settingsTypes", {
  description: "Get SettingsType Definitions",
  label: "Settings Types",
  run({ inCloud, inRequest }): Array<SettingsTypeInfo> {
    const user = inRequest.context.get<SessionData>("user");
    if (!user) {
      return [];
    }
    const role = inCloud.roles.getRole(user.role);
    return Array.from(
      role.settingsTypes.values().map((settingsType) => settingsType.info),
    ) as Array<SettingsTypeInfo>;
  },
  params: [],
});

export const generateInterfaces = new CloudAPIAction("generateInterfaces", {
  description: "Generate Entry Typescript Interfaces",
  label: "Generate Interfaces",
  async run({ orm }): Promise<{
    generatedEntries: Array<string>;
    generatedSettings: Array<string>;
  }> {
    return await orm.generateInterfaces();
  },
  params: [],
});
