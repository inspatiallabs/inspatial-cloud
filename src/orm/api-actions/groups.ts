import { defineAPIGroup } from "@inspatial/cloud";
import { CloudAPIGroup } from "../../api/cloud-group.ts";
import {
  count,
  countConnections,
  createEntryAction,
  deleteEntryAction,
  exportEntry,
  getEntryAction,
  getEntryListAction,
  getEntryTypeInfoAction,
  newEntryAction,
  runEntryAction,
  sum,
  updateEntryAction,
} from "./entries-group.ts";
import {
  entryTypesInfo,
  generateInterfaces,
  getClientInterfaces,
  settingsTypesInfo,
} from "./orm-group.ts";
import {
  getSettings,
  getSettingsInfo,
  runSettingsAction,
  updateSettings,
} from "./settings-group.ts";

export const entriesGroup = defineAPIGroup("entry", {
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
    exportEntry,
    countConnections,
    sum,
    count,
  ],
});

export const ormGroup = defineAPIGroup("orm", {
  description: "ORM related actions",
  label: "ORM",
  actions: [
    entryTypesInfo,
    settingsTypesInfo,
    generateInterfaces,
    getClientInterfaces,
  ],
});

export const settingsGroup = defineAPIGroup("settings", {
  description: "Actions for managing settings",
  actions: [
    getSettingsInfo,
    getSettings,
    updateSettings,
    runSettingsAction,
  ],
});
