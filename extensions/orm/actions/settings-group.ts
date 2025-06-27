import { CloudAPIAction } from "~/api/cloud-action.ts";
import { CloudAPIGroup } from "~/api/cloud-group.ts";
import type { SettingsType } from "~/orm/mod.ts";

const getSettingsInfo = new CloudAPIAction("getSettingsInfo", {
  label: "Get Settings Info",
  description: "Get the settings info for a given settings type",
  run({ inCloud, inRequest, params }): SettingsType["info"] {
    const user = inRequest.context.get("user");
    const { settingsType } = params;
    const settingsTypeDef = inCloud.orm.getSettingsType(settingsType, user);
    return settingsTypeDef.info;
  },
  params: [{
    key: "settingsType",
    type: "DataField",
    label: "Settings Type",
    description: "The settings type to get",
    required: true,
  }],
});

const getSettings = new CloudAPIAction("getSettings", {
  label: "Get Settings",
  description: "Get the settings for a given settings type",
  async run({ inCloud, inRequest, params }): Promise<any> {
    const user = inRequest.context.get("user");
    const { settingsType, withModifiedTime } = params;
    const settings = await inCloud.orm.getSettings(settingsType, user);
    if (withModifiedTime) {
      return {
        data: settings.data,
        updatedAt: settings.updatedAt,
      };
    }
    return settings.data;
  },
  params: [{
    key: "settingsType",
    type: "DataField",
    label: "Settings Type",
    description: "The settings type to get",
    required: true,
  }, {
    key: "withModifiedTime",
    type: "BooleanField",
    label: "With Modified Time",
    description: "Whether to include the modified time for each field",
    required: false,
  }],
});

const updateSettings = new CloudAPIAction("updateSettings", {
  label: "Update Settings",
  description: "Update the settings for a given settings type",
  async run({ inCloud, inRequest, params }): Promise<any> {
    const user = inRequest.context.get("user");
    const { settingsType, data } = params;
    const settings = await inCloud.orm.updateSettings(settingsType, data, user);
    return settings.data;
  },
  params: [{
    key: "settingsType",
    type: "DataField",
    label: "Settings Type",
    description: "The settings type to update",
    required: true,
  }, {
    key: "data",
    type: "JSONField",
    label: "Data",
    description: "The data to update the settings with",
    required: true,
  }],
});

const runSettingsAction = new CloudAPIAction("runSettingsAction", {
  label: "Run Settings Action",
  description: "Run a settings action for a given settings type",
  async run({ inCloud, inRequest, params }): Promise<any> {
    const user = inRequest.context.get("user");
    const settings = await inCloud.orm.getSettings(params.settingsType, user);
    return await settings.runAction(params.action, params.data);
  },
  params: [{
    key: "settingsType",
    type: "DataField",
    label: "Settings Type",
    description: "The settings type to run the action for",
    required: true,
  }, {
    key: "action",
    type: "DataField",
    label: "Action",
    description: "The action to run",
    required: true,
  }, {
    key: "data",
    type: "JSONField",
    label: "Data",
    description: "The data to run the action with",
    required: false,
  }],
});

const settingsGroup = new CloudAPIGroup("settings", {
  description: "Actions for managing settings",
  actions: [
    getSettingsInfo,
    getSettings,
    updateSettings,
    runSettingsAction,
  ],
});

export default settingsGroup;
