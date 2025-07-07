import { CloudAPIGroup } from "../../api/cloud-group.ts";
import {
  createEntryAction,
  deleteEntryAction,
  getEntryAction,
  getEntryListAction,
  getEntryTypeInfoAction,
  newEntryAction,
  runEntryAction,
  updateEntryAction,
} from "./entries-group.ts";
import {
  entryTypesInfo,
  generateInterfaces,
  settingsTypesInfo,
} from "./orm-group.ts";
import {
  getSettings,
  getSettingsInfo,
  runSettingsAction,
  updateSettings,
} from "./settings-group.ts";

export const entriesGroup = new CloudAPIGroup("entry", {
  description: "CRUD actions for InSpatial ORM Entries",
  actions: [
    getEntryTypeInfoAction,
    getEntryAction,
    runEntryAction,
    updateEntryAction,
    newEntryAction,
    createEntryAction,
    deleteEntryAction,
    getEntryListAction,
  ],
});

export const ormGroup = new CloudAPIGroup("orm", {
  description: "ORM related actions",
  label: "ORM",
  actions: [
    entryTypesInfo,
    settingsTypesInfo,
    generateInterfaces,
  ],
});

export const settingsGroup = new CloudAPIGroup("settings", {
  description: "Actions for managing settings",
  actions: [
    getSettingsInfo,
    getSettings,
    updateSettings,
    runSettingsAction,
  ],
});
