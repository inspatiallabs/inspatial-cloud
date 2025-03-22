import type { ServerExtension } from "@inspatial/serve";

import { type CloudActionGroup } from "#/cloud-action.ts";
import type { InSpatialCloud } from "#/inspatial-cloud.ts";
import { type EntryType, SettingsType } from "#orm";
import { AppEntryHooks } from "#/types.ts";
export type PackInstallFunction<R = any> = (
  app: InSpatialCloud,
) => R;
export type PackBootFunction = (app: InSpatialCloud) => void;

export class CloudExtension<
  S extends Array<ServerExtension> = Array<ServerExtension>,
  AG extends Array<CloudActionGroup> = Array<CloudActionGroup>,
  N extends string = string,
  E extends Array<EntryType<any>> = Array<EntryType<any>>,
> {
  key: string;
  title: string;
  description: string;
  version: string;
  serverExtensions: S;
  entryTypes: EntryType[];
  settingsTypes: SettingsType[];
  ormGlobalHooks: AppEntryHooks;
  actionGroups: AG;
  install: PackInstallFunction;
  boot: PackBootFunction;

  constructor(config: {
    key: string;
    title: string;
    description: string;
    version: string;
    serverExtensions?: S;
    entryTypes?: E;
    settingsTypes?: SettingsType[];
    ormGlobalHooks?: Partial<AppEntryHooks>;
    actionGroups?: AG;
    install: PackInstallFunction;
    boot?: PackBootFunction;
  }) {
    this.key = config.key;
    this.title = config.title;
    this.description = config.description;
    this.version = config.version;
    const globalHooks = config.ormGlobalHooks;
    this.ormGlobalHooks = {
      beforeValidate: globalHooks?.beforeValidate || [],
      validate: globalHooks?.validate || [],
      beforeCreate: globalHooks?.beforeCreate || [],
      afterCreate: globalHooks?.afterCreate || [],
      beforeUpdate: globalHooks?.beforeUpdate || [],
      afterUpdate: globalHooks?.afterUpdate || [],
      beforeDelete: globalHooks?.beforeDelete || [],
      afterDelete: globalHooks?.afterDelete || [],
    };
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
