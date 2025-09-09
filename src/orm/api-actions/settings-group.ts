import { CloudAPIAction } from "~/api/cloud-action.ts";
import type { SettingsType } from "~/orm/mod.ts";
import type { SettingsName } from "#types/models.ts";

export const getSettingsInfo = new CloudAPIAction("getSettingsInfo", {
  label: "Get Settings Info",
  description: "Get the settings info for a given settings type",
  action({ orm, params }): SettingsType["info"] {
    const { settingsType } = params;
    const settingsTypeDef = orm.getSettingsType(settingsType as SettingsName);
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

export const getSettings = new CloudAPIAction("getSettings", {
  label: "Get Settings",
  description: "Get the settings for a given settings type",
  async action({ orm, params }): Promise<any> {
    const { withModifiedTime } = params;
    const settingsType = params.settingsType as SettingsName;
    const settings = await orm.getSettings(settingsType);
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

export const updateSettings = new CloudAPIAction("updateSettings", {
  label: "Update Settings",
  description: "Update the settings for a given settings type",
  async action({ orm, params }): Promise<any> {
    const { data } = params;
    const settingsType = params.settingsType as SettingsName;
    const settings = await orm.updateSettings(settingsType, data);
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

export const runSettingsAction = new CloudAPIAction("runSettingsAction", {
  label: "Run Settings Action",
  description: "Run a settings action for a given settings type",
  async action({ orm, params }): Promise<any> {
    const settingsType = params.settingsType as SettingsName;
    const settings = await orm.getSettings(settingsType);
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
  }, {
    key: "enqueue",
    type: "BooleanField",
    label: "Enqueue",
    description:
      "Whether to send the action to the queue instead of running it immediately",
    required: false,
  }],
});
