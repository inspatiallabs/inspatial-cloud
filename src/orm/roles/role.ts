import convertString from "~/utils/convert-string.ts";
import { EntryType } from "~/orm/entry/entry-type.ts";
import type { Entry } from "~/orm/entry/entry.ts";
import { SettingsType } from "~/orm/settings/settings-type.ts";
import type { Settings } from "~/orm/settings/settings.ts";
import { raiseORMException } from "~/orm/orm-exception.ts";
import {
  ConnectionRegistry,
  type EntryTypeRegistry,
} from "~/orm/registry/connection-registry.ts";
import { buildEntryType } from "~/orm/setup/entry-type/build-entry-types.ts";
import { validateEntryType } from "~/orm/setup/entry-type/validate-entry-type.ts";
import { registerFetchFields } from "~/orm/setup/setup-utils.ts";
import { buildSettingsType } from "~/orm/setup/settings-type/build-settings-types.ts";
import { buildEntry } from "~/orm/entry/build-entry.ts";
import { buildSettings } from "~/orm/settings/build-settings.ts";
import type { InSpatialORM } from "~/orm/inspatial-orm.ts";

import type { EntryPermission } from "~/orm/roles/entry-permissions.ts";
import type { SettingsPermission } from "~/orm/roles/settings-permissions.ts";

import type { EntryBase, GenericEntry } from "~/orm/entry/entry-base.ts";
import type {
  GenericSettings,
  SettingsBase,
} from "~/orm/settings/settings-base.ts";
import type { InField } from "~/orm/field/field-def-types.ts";
import type { Choice } from "~/orm/field/types.ts";
import type { EntryConfig } from "~/orm/entry/types.ts";
import type { SettingsConfig } from "~/orm/settings/types.ts";

import type { UserID } from "~/auth/types.ts";
import { raiseCloudException } from "~/serve/exeption/cloud-exception.ts";

export class Role {
  readonly roleName: string;
  label: string;
  description: string;
  entryTypes: Map<string, EntryType>;
  #entryClasses: Map<string, typeof Entry>;
  settingsTypes: Map<string, SettingsType>;
  #settingsClasses: Map<string, typeof Settings>;
  registry: ConnectionRegistry;
  #locked: boolean;
  entryPermissions: Map<string, EntryPermission>;
  settingsPermissions: Map<string, SettingsPermission>;

  constructor(config: RoleConfig) {
    this.#locked = false;
    this.roleName = config.roleName;
    this.description = config.description || "";
    this.label = config.label || convertString(config.roleName, "title", true);
    this.entryPermissions = new Map(Object.entries(config.entryTypes || {}));
    this.settingsPermissions = new Map(
      Object.entries(config.settingsTypes || {}),
    );
    this.entryTypes = new Map();
    this.#entryClasses = new Map();
    this.settingsTypes = new Map();
    this.#settingsClasses = new Map();
    this.registry = new ConnectionRegistry();
  }
  get globalEntryTypes(): Array<EntryType> {
    return Array.from(this.entryTypes.values()).filter(
      (et) => et.systemGlobal,
    );
  }

  get accountEntryTypes(): Array<EntryType> {
    return Array.from(this.entryTypes.values()).filter(
      (et) => !et.systemGlobal,
    );
  }

  get globalSettingsTypes(): Array<SettingsType> {
    return Array.from(this.settingsTypes.values()).filter(
      (st) => st.systemGlobal,
    );
  }

  get accountSettingsTypes(): Array<SettingsType> {
    return Array.from(this.settingsTypes.values()).filter(
      (st) => !st.systemGlobal,
    );
  }

  getEntryType<T extends EntryType = EntryType>(
    entryType: string,
  ): T {
    if (!this.entryTypes.has(entryType)) {
      raiseORMException(
        `EntryType ${entryType} does not exist in ORM`,
        "EntryType",
        400,
      );
    }
    return this.entryTypes.get(entryType)! as T;
  }
  getSettingsType<T extends SettingsType = SettingsType>(
    settingsType: string,
  ): T {
    if (!this.settingsTypes.has(settingsType)) {
      raiseORMException(`SettingsType ${settingsType} does not exist in ORM`);
    }
    return this.settingsTypes.get(settingsType)! as T;
  }
  addEntryType(entryType: EntryType): void {
    if (this.#locked) return;
    if (this.entryTypes.has(entryType.name)) {
      raiseORMException(
        `Role ${this.roleName} already has ${entryType.name} EntryType`,
      );
    }
    this.entryTypes.set(entryType.name, entryType);
  }
  addSettingsType(settingsType: SettingsType): void {
    if (this.#locked) return;
    if (this.settingsTypes.has(settingsType.name)) {
      raiseORMException(
        `Role ${this.roleName} already has ${settingsType.name} EntryType`,
      );
    }
    this.settingsTypes.set(settingsType.name, settingsType);
  }
  setup(): void {
    if (this.#locked) return;
    this.#setupEntryTypes();
    this.#setupSettingsTypes();
    this.#build();
    this.#locked = true;
  }
  #setupEntryTypes(): void {
    for (const entryType of this.entryTypes.values()) {
      buildEntryType(this, entryType);
    }
    for (const entryType of this.entryTypes.values()) {
      validateEntryType(this, entryType);
      registerFetchFields(this, entryType);
    }
  }
  #setupSettingsTypes(): void {
    for (const settingsType of this.settingsTypes.values()) {
      buildSettingsType(this, settingsType);
    }
  }

  #build(): void {
    for (const entryType of this.entryTypes.values()) {
      const entryClass = buildEntry(entryType);
      this.#entryClasses.set(entryType.name, entryClass);
    }
    for (const settingsType of this.settingsTypes.values()) {
      const settingsClass = buildSettings(settingsType);
      this.#settingsClasses.set(settingsType.name, settingsClass);
    }
  }
  getEntryInstance<E extends EntryBase = GenericEntry>(
    orm: InSpatialORM,
    entryType: string,
    user: UserID,
  ): E {
    const entryClass = this.#entryClasses.get(entryType);
    if (!entryClass) {
      raiseORMException(
        `EntryType ${entryType} is not a valid entry type for role ${this.roleName}`,
      );
    }
    return new entryClass({ orm, inCloud: orm._inCloud, user }) as E;
  }

  getSettingsInstance<S extends SettingsBase = GenericSettings>(
    orm: InSpatialORM,
    settingsType: string,
    user: UserID,
  ): S {
    const settingsClass = this.#settingsClasses.get(settingsType);
    if (!settingsClass) {
      raiseORMException(
        `SettingsType ${settingsType} is not a valid settings type.`,
      );
    }
    return new settingsClass({
      orm,
      inCloud: orm._inCloud,
      name: settingsType,
      user,
    }) as S;
  }
}

export interface RoleConfig {
  roleName: string;
  label?: string;
  description?: string;
  entryTypes?: Record<string, EntryPermission>;
  settingsTypes?: Record<string, SettingsPermission>;
}

export class RoleManager {
  readonly defaultRole: string;
  roles: Map<string, Role>;
  #locked: boolean;

  constructor() {
    this.roles = new Map();
    this.defaultRole = "accountOwner";
    this.#locked = false;
  }
  addRole(config: RoleConfig): void {
    if (this.roles.has(config.roleName)) {
      raiseORMException(`Role ${config.roleName} already exists`);
    }
    const role = new Role(config);
    this.roles.set(role.roleName, role);
  }
  addEntryType(entryType: EntryType): void {
    if (entryType.name === "account") {
      const usersChild = entryType.children!.get("users")!;
      const roleField = usersChild.fields.get("role")! as InField<
        "ChoicesField"
      >;

      const roles: Array<Choice> = [];
      for (const role of this.roles.values()) {
        roles.push({
          key: role.roleName,
          label: role.label,
          description: role.description,
        });
      }
      roleField.choices = roles;
    }
    for (const role of this.roles.values()) {
      const permission = role.entryPermissions.get(entryType.name);
      if (!permission) {
        continue;
      }
      const roleEntryType = buildEntryTypeForRole(
        entryType,
        permission,
      );
      role.addEntryType(roleEntryType);
    }
  }

  addSettingsType(settingsType: SettingsType): void {
    for (const role of this.roles.values()) {
      const permission = role.settingsPermissions.get(settingsType.name);
      if (!permission) {
        continue;
      }
      const roleSettingsType = buildSettingsTypeForRole(
        settingsType,
        permission,
      );
      role.addSettingsType(roleSettingsType);
    }
  }

  getEntryInstance<E extends EntryBase = GenericEntry>(
    orm: InSpatialORM,
    entryType: string,
    user: UserID,
  ): E {
    const role = this.getRole(user?.role || this.defaultRole);
    return role.getEntryInstance<E>(orm, entryType, user);
  }

  getSettingsInstance<S extends SettingsBase = GenericSettings>(
    orm: InSpatialORM,
    settingsType: string,
    user: UserID,
  ): S {
    const role = this.getRole(user?.role || this.defaultRole);
    return role.getSettingsInstance<S>(orm, settingsType, user);
  }

  getRole(roleName: string): Role {
    if (!this.roles.has(roleName)) {
      raiseCloudException(`Role ${roleName} doesn't exist!`);
    }
    return this.roles.get(roleName)!;
  }

  getEntryType<T extends EntryType = EntryType>(
    entryType: string,
    roleName: string,
  ): T {
    const role = this.getRole(roleName);
    return role.getEntryType<T>(entryType);
  }
  getSettingsType<T extends SettingsType = SettingsType>(
    settingsType: string,
    roleName: string,
  ): T {
    const role = this.getRole(roleName);
    return role.getSettingsType<T>(settingsType);
  }
  getRegistry(
    entryType: string,
    roleName: string,
  ): EntryTypeRegistry | undefined {
    const role = this.getRole(roleName);
    return role.registry.getEntryTypeRegistry(entryType);
  }
  setup(): void {
    if (this.#locked) return;
    for (const role of this.roles.values()) {
      role.setup();
    }
    this.#locked = true;
  }
}

function buildEntryTypeForRole(
  entryType: EntryType,
  permission: EntryPermission,
): EntryType {
  const config = {
    ...entryType.sourceConfig,
  };
  setFieldPermissions(config, permission);
  config.actions = Array.from(entryType.actions.values());
  setActionsPermissions(config, permission);
  const roleEntryType = new EntryType(entryType.name, config, true);

  roleEntryType.permission = { ...permission };
  roleEntryType.dir = entryType.dir;
  roleEntryType.info = {
    ...roleEntryType.info,
    permission: {
      modify: permission.modify,
      create: permission.create,
      delete: permission.delete,
    },
  };
  roleEntryType.config.extension = entryType.config.extension;
  return roleEntryType;
}

function buildSettingsTypeForRole(
  settingsType: SettingsType,
  permission: SettingsPermission,
): SettingsType {
  const config = {
    ...settingsType.sourceConfig,
  };
  setFieldPermissions(config, permission);
  setActionsPermissions(config, permission);
  const roleSettingsType = new SettingsType(settingsType.name, config, true);
  roleSettingsType.config.extension = settingsType.config.extension;
  roleSettingsType.dir = settingsType.dir;
  roleSettingsType.permission = permission;
  roleSettingsType.info = {
    ...roleSettingsType.info,
    permission: {
      modify: permission.modify,
    },
  };
  return roleSettingsType;
}
function setActionsPermissions(
  config: EntryConfig | SettingsConfig,
  permission: EntryPermission | SettingsPermission,
): void {
  const perm = permission.actions;
  if (!perm) {
    return;
  }
  const actions = config.actions || [];
  const usedActions: Array<any> = [];
  for (const action of actions) {
    if (perm.include !== undefined && !perm.include.includes(action.key)) {
      continue;
    }
    if (perm.exclude !== undefined && perm.exclude.includes(action.key)) {
      continue;
    }
    usedActions.push(action);
  }
  config.actions = usedActions;
}
function setFieldPermissions(
  config: EntryConfig | SettingsConfig,
  permission: EntryPermission | SettingsPermission,
): void {
  const fields: Map<string, InField> = new Map(
    config.fields.map((field) => [field.key, { ...field }]),
  );

  if (permission.modify === false) {
    for (const field of fields.values()) {
      if (permission.fields && field.key in permission.fields) {
        const fieldPermission = permission.fields[field.key];
        if (fieldPermission?.modify) {
          continue;
        }
      }
      field.readOnly = true;
    }
  }
  const removeFromGroup = new Set<string>();
  if (permission.fields) {
    for (
      const [fieldKey, fieldPermission] of Object.entries(permission.fields)
    ) {
      const field = fields.get(fieldKey);
      if (!field) {
        raiseCloudException(`field ${fieldKey} doesn't exist!`);
      }
      if (fieldPermission?.view === false) {
        fields.delete(fieldKey);
        removeFromGroup.add(fieldKey);
        continue;
      }
    }
  }
  config.fields = Array.from(fields.values());

  if (config.fieldGroups) {
    for (const group of config.fieldGroups) {
      group.fields = group.fields.filter(
        (fieldKey) => !removeFromGroup.has(fieldKey as string),
      );
    }
  }
  if (isEntryConfig(config)) {
    config.defaultListFields = config.defaultListFields?.filter(
      (fieldKey) => !removeFromGroup.has(fieldKey as string),
    );
    config.searchFields = config.searchFields?.filter((fieldKey) =>
      !removeFromGroup.has(fieldKey as string)
    );
  }
}

function isEntryConfig(
  config: EntryConfig | SettingsConfig,
): config is EntryConfig {
  return "defaultListFields" in config;
}
