import { CloudAPIAction } from "~/api/cloud-action.ts";
import type { SettingsTypeInfo } from "~/orm/settings/types.ts";
import type { EntryTypeInfo } from "~/orm/entry/types.ts";
import type { SessionData } from "~/auth/types.ts";

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

export const getClientInterfaces = new CloudAPIAction("getClientInterfaces", {
  description: "Get Client Typescript Interfaces",
  label: "Get Client Interfaces",
  run({ orm, inResponse }) {
    const result = orm.generateClientInterfaces();
    return inResponse.setFile({
      content: result,
      fileName: "client-interfaces.ts",
      download: true,
    });
  },
  params: [],
});
