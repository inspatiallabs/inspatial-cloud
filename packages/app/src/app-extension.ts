import type { ServerExtension } from "@inspatial/serve";
// import { EntryType } from "../../easyOrm/src/entry/entry/entryType/entryType.ts";
// import { SettingsType } from "../../easyOrm/src/entry/settings/settingsType.ts";
interface SettingsType {}
interface EntryType {}

import { AppAction, type AppActionGroup } from "#/app-action.ts";
import type { InSpatialApp } from "#/inspatial-app.ts";
export type PackInstallFunction<R = any> = (
  app: InSpatialApp,
) => R;
export type PackBootFunction = (app: InSpatialApp) => void;

export class AppExtension<
  S extends Array<ServerExtension> = Array<ServerExtension>,
  AG extends Array<AppActionGroup> = Array<AppActionGroup>,
> {
  key: string;
  title: string;
  description: string;
  version: string;
  serverExtensions: S;
  entryTypes: EntryType[];
  settingsTypes: SettingsType[];
  actionGroups: AG;
  install: PackInstallFunction;
  boot: PackBootFunction;

  constructor(config: {
    key: string;
    title: string;
    description: string;
    version: string;
    serverExtensions?: S;
    entryTypes?: EntryType[];
    settingsTypes?: SettingsType[];
    actionGroups?: AG;
    install: PackInstallFunction;
    boot?: PackBootFunction;
  }) {
    this.key = config.key;
    this.title = config.title;
    this.description = config.description;
    this.version = config.version;
    this.serverExtensions = [] as any;
    for (const serverExtension of config.serverExtensions || []) {
      this.serverExtensions.push(serverExtension);
    }
    this.entryTypes = config.entryTypes || [];
    this.settingsTypes = config.settingsTypes || [];
    this.actionGroups = [] as any;
    for (const actionGroup of config.actionGroups || []) {
      this.actionGroups.push(actionGroup);
    }
    this.install = config.install;
    this.boot = config.boot || (() => {});
  }
}
const action = new AppAction("test", {
  run({ params }) {
  },
  params: [
    {
      key: "test",
      type: "string",
      required: true,
    },
    {
      key: "test2",
      type: "number",
      required: false,
    },
  ],
});
