import { CloudAction, CloudActionGroup } from "#/cloud-action.ts";
import type { SettingsTypeInfo } from "../../../../orm/src/settings/types.ts";

const getSettingsInfoAction = new CloudAction("getSettingsInfo", {
  label: "Get Settings Info",
  description: "Get the settings info for a given settings type",
  run({ app, inRequest, params }): SettingsTypeInfo {
    const { settingsType } = params;
    const settingsTypeInfo = app.orm.getSettingsType(settingsType);
    return settingsTypeInfo.info;
  },
  params: [{
    key: "settingsType",
    type: "string",
    label: "Settings Type",
    description: "The settings type to get",
    required: true,
  }],
});

const getSettingsAction = new CloudAction("getSettings", {
  label: "Get Settings",
  description: "Get the settings for a given settings type",
  async run({ app, inRequest, params }): Promise<any> {
    const { settingsType } = params;
    const settings = await app.orm.getSettings(settingsType);
    return settings.data;
  },
  params: [{
    key: "settingsType",
    type: "string",
    label: "Settings Type",
    description: "The settings type to get",
    required: true,
  }],
});

const updateSettingsAction = new CloudAction("updateSettings", {
  label: "Update Settings",
  description: "Update the settings for a given settings type",
  async run({ app, inRequest, params }): Promise<any> {
    const { settingsType, data } = params;
    const settings = await app.orm.getSettings(settingsType);
    settings.update(data);
    await settings.save();
    return settings.data;
  },
  params: [{
    key: "settingsType",
    type: "string",
    label: "Settings Type",
    description: "The settings type to update",
    required: true,
  }, {
    key: "data",
    type: "object",
    label: "Data",
    description: "The data to update the settings with",
    required: true,
  }],
});

const settingsGroup = new CloudActionGroup("settings", {
  description: "Actions for managing settings",
  actions: [
    getSettingsInfoAction,
    getSettingsAction,
    updateSettingsAction,
  ],
});

export default settingsGroup;
