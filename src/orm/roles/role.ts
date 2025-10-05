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

import type { InField } from "~/orm/field/field-def-types.ts";
import type { EntryConfig, EntryConnection } from "~/orm/entry/types.ts";
import type { SettingsConfig } from "~/orm/settings/types.ts";

import type { UserID } from "~/auth/types.ts";
import { raiseCloudException } from "~/serve/exeption/cloud-exception.ts";
import type { BrokerClient } from "../../in-live/broker-client.ts";
import type {
  EntryMap,
  EntryName,
  SettingsMap,
  SettingsName,
} from "#types/models.ts";
export class Role {
  readonly roleName: string;
  label: string;
  description: string;
  extendsRole?: string;
  entryTypes: Map<string, EntryType>;
  #entryClasses: Map<string, typeof Entry>;
  settingsTypes: Map<string, SettingsType<any>>;
  #settingsClasses: Map<string, typeof Settings<any>>;
  registry: ConnectionRegistry;
  #locked: boolean;
  entryPermissions: Map<string, EntryPermission>;
  settingsPermissions: Map<string, SettingsPermission>;
  apiGroups: Map<string, Set<string> | true>;

  constructor(config: RoleConfig) {
    this.#locked = false;
    this.roleName = config.roleName;
    this.extendsRole = config.extendsRole;
    this.description = config.description || "";
    this.label = config.label || convertString(config.roleName, "title", true);
    this.entryPermissions = new Map(Object.entries(config.entryTypes || {}));
    this.settingsPermissions = new Map(
      Object.entries(config.settingsTypes || {}),
    );
    this.apiGroups = new Map();
    if (config.apiGroups) {
      for (const [group, actions] of Object.entries(config.apiGroups)) {
        this.apiGroups.set(
          group,
          typeof actions === "boolean" ? actions : new Set(actions),
        );
      }
    }
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

  getEntryType<E extends EntryName>(
    entryType: E,
  ): EntryType<E> {
    if (!this.entryTypes.has(entryType)) {
      raiseORMException(
        `EntryType ${entryType} does not exist in ORM`,
        "NoEntryType",
        400,
      );
    }
    return this.entryTypes.get(entryType)! as EntryType<E>;
  }
  getSettingsType<S extends SettingsName>(
    settingsType: S,
  ): SettingsType<S> {
    if (!this.settingsTypes.has(settingsType)) {
      raiseORMException(`SettingsType ${settingsType} does not exist in ORM`);
    }
    return this.settingsTypes.get(settingsType)!;
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
  /** replaces an existing entryType or adds a new one */
  updateEntryType(entryType: EntryType) {
    this.entryTypes.set(entryType.name, entryType);
    buildEntryType(this, entryType);
    validateEntryType(this, entryType);
    registerFetchFields(
      this,
      entryType,
    ); /*  TODO: unregister existing fetch fields from role.registry */

    this.#setupEntryConnections();
    const entryClass = buildEntry(entryType);
    this.#entryClasses.set(entryType.name, entryClass);
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
    this.#setupEntryConnections();
  }
  #setupEntryConnections(): void {
    const connections = new Map<string, Array<EntryConnection>>();
    for (const entryType of this.entryTypes.values()) {
      const connectionsFields = entryType.fields.values().filter((field) =>
        field.type === "ConnectionField"
      );
      for (const field of connectionsFields) {
        if (!connections.has(field.entryType)) {
          connections.set(field.entryType, []);
        }
        connections.get(field.entryType)!.push({
          referencingEntry: entryType.name,
          referencingEntryLabel: entryType.label,
          referencingField: field.key,
          referencingFieldLabel: field.label || field.key,
          listFields: entryType.info.defaultListFields,
        });
      }
    }
    for (const [entryName, connectionFields] of connections.entries()) {
      const entryType = this.getEntryType(entryName as EntryName);
      entryType.connections = [];
      for (const connection of connectionFields) {
        entryType.connections.push({
          ...connection,
          listFields: [
            ...connection.listFields.filter((field) =>
              !(field.type === "ConnectionField" &&
                field.entryType === entryName)
            ),
          ],
        });
      }

      entryType.info = {
        ...entryType.info,
        connections: [...entryType.connections],
      };
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
  getEntryInstance<E extends EntryName>(
    orm: InSpatialORM,
    entryType: E,
    user: UserID,
  ): EntryMap[E] {
    const entryClass = this.#entryClasses.get(entryType);
    if (!entryClass) {
      raiseORMException(
        `EntryType ${entryType} is not a valid entry type for role ${this.roleName}`,
      );
    }
    return new entryClass({ orm, inCloud: orm._inCloud, user }) as EntryMap[E];
  }

  getSettingsInstance<S extends SettingsName>(
    orm: InSpatialORM,
    settingsType: S,
    user: UserID,
  ): SettingsMap[S] {
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
    }) as SettingsMap[S];
  }
}

export interface RoleConfig {
  roleName: string;
  extendsRole?: string;
  label?: string;
  description?: string;
  entryTypes?: Record<string, EntryPermission>;
  settingsTypes?: Record<string, SettingsPermission>;
  apiGroups?: Record<string, Array<string> | true>;
}

export class RoleManager {
  readonly defaultRole: string;
  roles: Map<string, Role>;
  #rootEntryTypes: Map<string, EntryType>;
  #rootSettingsTypes: Map<string, SettingsType>;
  #locked: boolean;
  #updateRole: (config: RoleConfig) => void;
  constructor(channel: BrokerClient) {
    this.roles = new Map();
    this.#rootEntryTypes = new Map();
    this.#rootSettingsTypes = new Map();
    this.defaultRole = "accountOwner";
    this.#locked = false;
    this.#updateRole = channel.addChannel<RoleConfig>("roles", (roleConfig) => {
      this.#setNewRole(roleConfig);
    });
  }
  addRole(config: RoleConfig): void {
    if (this.roles.has(config.roleName)) {
      raiseORMException(`Role ${config.roleName} already exists`);
    }
    const role = new Role(config);
    this.roles.set(role.roleName, role);
  }
  #setNewRole(config: RoleConfig): void {
    const role = new Role(config);
    this.roles.set(role.roleName, role);
    this.setupRole(role.roleName);
  }
  updateRole(config: RoleConfig): void {
    this.#setNewRole(config);
    this.#updateRole(config);
  }
  addEntryType(entryType: EntryType): void {
    const permission: EntryPermission = {
      view: true,
      modify: true,
      create: true,
      delete: true,
      actions: {
        include: entryType.actions
          ? Array.from(entryType.actions.keys())
          : undefined,
      },
    };
    const admin = this.getRole("systemAdmin");
    admin.entryPermissions.set(entryType.name, permission);
    if (entryType.config.extension?.key !== "core") {
      const accountAdmin = this.getRole("accountAdmin");
      accountAdmin.entryPermissions.set(entryType.name, permission);
    }

    this.#rootEntryTypes.set(entryType.name, entryType);
  }
  /**
   * replaces an existing entryType or creates a new one
   */

  updateEntryType(entryType: EntryType) {
    this.addEntryType(entryType);
    for (const role of this.roles.values()) {
      const permission = role.entryPermissions.get(entryType.name);
      if (!permission) {
        continue;
      }
      const roleEntryType = buildEntryTypeForRole(
        entryType,
        permission,
      );
      role.updateEntryType(roleEntryType);
    }
  }
  addSettingsType(settingsType: SettingsType): void {
    const permission: SettingsPermission = {
      modify: true,
      view: true,
      actions: {
        include: settingsType.actions
          ? Array.from(settingsType.actions.keys())
          : undefined,
      },
    };
    const admin = this.getRole("systemAdmin");
    admin.settingsPermissions.set(settingsType.name, permission);
    if (settingsType.config.extension?.key !== "core") {
      const accountAdmin = this.getRole("accountAdmin");
      accountAdmin.settingsPermissions.set(settingsType.name, permission);
    }
    this.#rootSettingsTypes.set(settingsType.name, settingsType);
  }
  setupRole(roleName: string): void {
    const role = this.getRole(roleName);
    for (const [name, entryType] of this.#rootEntryTypes.entries()) {
      const permission = role.entryPermissions.get(name);
      if (!permission) {
        continue;
      }
      const roleEntryType = buildEntryTypeForRole(
        entryType,
        permission,
      );
      role.addEntryType(roleEntryType);
    }
    for (const [name, settings] of this.#rootSettingsTypes.entries()) {
      const permission = role.settingsPermissions.get(name);
      if (!permission) {
        continue;
      }
      const roleSettingsType = buildSettingsTypeForRole(
        settings,
        permission,
      );
      role.addSettingsType(roleSettingsType);
    }

    role.setup();
  }

  getEntryInstance<E extends EntryName = EntryName>(
    orm: InSpatialORM,
    entryType: E,
    user: UserID,
  ): EntryMap[E] {
    const role = this.getRole(user?.role || this.defaultRole);
    return role.getEntryInstance<E>(orm, entryType, user);
  }

  getSettingsInstance<S extends SettingsName>(
    orm: InSpatialORM,
    settingsType: S,
    user: UserID,
  ): SettingsMap[S] {
    const role = this.getRole(user?.role || this.defaultRole);
    return role.getSettingsInstance<S>(orm, settingsType, user);
  }

  getRole(roleName: string): Role {
    if (!this.roles.has(roleName)) {
      raiseCloudException(`Role ${roleName} doesn't exist!`);
    }
    return this.roles.get(roleName)!;
  }

  getEntryType<E extends EntryName>(
    entryType: E,
    roleName: string,
  ): EntryType<E> {
    const role = this.getRole(roleName);
    return role.getEntryType(entryType);
  }
  getSettingsType<T extends SettingsName>(
    settingsType: T,
    roleName: string,
  ): SettingsType<T> {
    const role = this.getRole(roleName);
    return role.getSettingsType(settingsType);
  }
  getRegistry(
    entryType: string,
    roleName: string,
  ): EntryTypeRegistry | undefined {
    const role = this.getRole(roleName);
    return role.registry.getEntryTypeRegistry(entryType);
  }
  setup(): void {
    if (this.#locked) {
      console.log("RoleManager is locked, skipping setup.");
      return;
    }
    for (const role of this.roles.keys()) {
      this.setupRole(role);
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
  } as EntryConfig;
  setFieldPermissions(config, permission);
  config.actions = Array.from(entryType.actions.values());
  setActionsPermissions(config, permission);
  const roleEntryType = new EntryType(entryType.name, config as any, true);

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
  setFieldPermissions(config as any, permission);
  config.actions = Array.from(settingsType.actions.values());
  setActionsPermissions(config as any, permission);
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
