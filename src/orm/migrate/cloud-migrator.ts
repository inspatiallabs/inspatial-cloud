import { InCloud } from "~/in-cloud.ts";
import type { InSpatialORM } from "../mod.ts";
import type { CloudAPIGroup } from "../../api/cloud-group.ts";
import convertString from "../../utils/convert-string.ts";
import type { CloudAPIAction } from "@inspatial/cloud";
import type { EntryName } from "#types/models.ts";
import type { InField } from "../field/field-def-types.ts";
import type { EntryActionDefinition } from "../entry/types.ts";
import type { SettingsActionDefinition } from "../settings/types.ts";
import { handlePgError, isPgError } from "../db/postgres/pgError.ts";
import { raiseORMException } from "../orm-exception.ts";
import type { ListOptions } from "../db/db-types.ts";
import type { InFilter } from "~/orm/db/db-types.ts";

export class InCloudMigrator extends InCloud {
  constructor(appName: string, config: any) {
    super(appName, config, "migrator");
  }
  coreSynced = false;
  async migrate(): Promise<void> {
    await this.#migrateGlobal();
    await this.#migrateAccounts();
  }
  async #checkCoreVersion(orm: InSpatialORM) {
    const coreExtension = this.extensionManager.extensions.get("core");
    const coreVersion = coreExtension?.version;
    if (coreVersion === "$CLOUD_VERSION") {
      // we're running from source, skip version check

      return;
    }
    const tableExists = await orm.systemDb.tableExists("entryExtensionMeta");
    if (!tableExists) {
      return;
    }
    const coreRow = await orm.systemDb.getRow("entryExtensionMeta", "core");
    if (!coreRow) {
      return;
    }
    if (coreRow.version === coreVersion) {
      this.coreSynced = true;
      return;
    }
    console.log(
      `Core version is out of date: ${coreRow.version} -> ${coreVersion}`,
    );
  }
  async #migrateGlobal() {
    const withTime = async (name: string, callback: () => Promise<any>) => {
      console.time(name);
      await callback();
      console.timeEnd(name);
    };
    const orm = this.orm.withUser(this.orm.systemGobalUser);
    await this.#checkCoreVersion(orm);
    // await withTime("Global migration", async () => await orm.migrateGlobal());
    await orm.migrateGlobal();
    try {
      // await withTime(
      //   "Delete Obsolete",
      //   async () => await this.#deleteObsoleteMeta(orm),
      // );
      // await withTime(
      //   "Sync Extension Meta",
      //   async () => await this.#syncExtensionMeta(orm),
      // );
      // await withTime(
      //   "Sync Entry Meta",
      //   async () => await this.#syncEntryMeta(orm),
      // );
      // await withTime(
      //   "Sync Settings Meta",
      //   async () => await this.#syncSettingsMeta(orm),
      // );
      // await withTime(
      //   "Sync Field Meta",
      //   async () => await this.#syncFieldMeta(orm),
      // );
      // await withTime(
      //   "Sync Action Meta",
      //   async () => await this.#syncActionMeta(orm),
      // );

      // await withTime(
      //   "Sync Api Groups",
      //   async () => await this.#syncApiGroups(orm),
      // );
      // await withTime(
      //   "Sync Roles",
      //   async () => await this.#syncRoles(orm),
      // );
      await this.#deleteObsoleteMeta(orm);
      await this.#syncExtensionMeta(orm);
      await this.#syncEntryMeta(orm);
      await this.#syncSettingsMeta(orm);
      await this.#syncFieldMeta(orm);
      await this.#syncActionMeta(orm);
      await this.#syncApiGroups(orm);
      await this.#syncRoles(orm);
    } catch (e) {
      if (isPgError(e)) {
        const { response, subject } = handlePgError(e);
        this.inLog.error(response, {
          stackTrace: e.stack,
          subject,
        });
        raiseORMException(response.join("\n"), subject);
      }
    }
    for (const migrateAction of this.extensionManager.afterMigrate.global) {
      await migrateAction.action({
        inCloud: this,
        orm,
      });
    }
  }
  async #syncExtensionMeta(orm: InSpatialORM) {
    for (const extension of this.extensionManager.extensions.values()) {
      let model = await orm.findEntry("extensionMeta", {
        id: extension.key,
      });
      if (!model) {
        model = orm.getNewEntry("extensionMeta");
        model.$key = extension.key;
      }
      model.$label = extension.label;
      model.$description = extension.description;
      model.$version = extension.version;
      model.$icon = extension.icon || "extension";
      await model.save();
    }
    const extensionKeys = Array.from(
      this.extensionManager.extensions.keys(),
    );
    await orm.db.deleteRows("entryExtensionMeta", [{
      field: "id",
      op: "notInList",
      value: extensionKeys,
    }]);
  }
  async #syncEntryMeta(orm: InSpatialORM) {
    const adminRole = orm.roles.getRole("systemAdmin"); // ensure admin role exists
    const entryNames = new Set<string>();
    for (const entryType of adminRole.entryTypes.values()) {
      if (entryType.config.extension?.key === "core" && this.coreSynced) {
        continue; // skip core entries if core is already synced
      }
      const name = entryType.name;
      entryNames.add(name);
      let model = await orm.findEntry("entryMeta", {
        id: name,
      });
      if (!model) {
        model = orm.getNewEntry("entryMeta");
        model.$name = name;
      }
      model.$systemGlobal = entryType.systemGlobal || false;
      model.$label = entryType.label || name;
      model.$description = entryType.description;
      model.$titleField = entryType.config.titleField;
      model.$extension = entryType.config.extension?.key;
      const parseHookFunc = (funcString: string) => {
        const regex = /handler[^\)]+[^\{]+\{(.*)\}$/s;
        const match = funcString.match(regex);
        if (match) {
          let smallesSpaceCount = Infinity;
          for (const line of match[1].split("\n")) {
            const spaceCount = line.match(/^\s*/)?.[0].length || 0;
            if (spaceCount < smallesSpaceCount && line.trim().length > 0) {
              smallesSpaceCount = spaceCount;
            }
          }
          funcString = match[1].split("\n").map((l) =>
            l.slice(smallesSpaceCount)
          ).join("\n");
        }

        return funcString;
      };
      const hooks = Object.entries(entryType.hooks).flatMap((
        [hookName, hookDefs],
      ) =>
        Array.from(
          hookDefs.values().map((hookDef) => ({
            hook: hookName,
            name: hookDef.name,
            description: hookDef.description,
            handler: parseHookFunc(hookDef.handler.toString()),
            active: true,
          })),
        )
      );
      model.$hooks.update(hooks as any[]);

      await model.save();
    }
  }
  async #syncSettingsMeta(orm: InSpatialORM) {
    const adminRole = orm.roles.getRole("systemAdmin");
    const settingsNames = new Set<string>();
    for (const [key, setting] of adminRole.settingsTypes.entries()) {
      if (setting.config.extension?.key === "core" && this.coreSynced) {
        continue; // skip core settings if core is already synced
      }
      settingsNames.add(key);
      let model = await orm.findEntry("settingsMeta", {
        id: key,
      });
      if (!model) {
        model = orm.getNewEntry("settingsMeta");
        model.$settingsName = key;
      }
      model.$label = setting.label || convertString(key, "title", true);
      model.$description = setting.description;
      model.$extensionMeta = setting.config.extension!.key;
      model.$systemGlobal = setting.systemGlobal || false;

      const hooks = Object.entries(setting.hooks || {}).flatMap((
        [hookName, hookDefs],
      ) =>
        Array.from(
          hookDefs.values().map((hookDef) => ({
            hook: hookName,
            name: hookDef.name,
            description: hookDef.description,
            handler: hookDef.handler.toString(),
            active: true,
          })),
        )
      );
      model.$hooks.update(hooks as any[]);
      await model.save();
    }
  }
  async #syncFieldMeta(orm: InSpatialORM) {
    const adminRole = orm.roles.getRole("systemAdmin");
    const skipFields = new Set<string>([
      "in__tags",
    ]);
    const syncFields = async (
      fields: Map<string, InField>,
      name: string,
      type: "entry" | "settings",
    ) => {
      for (const [key, field] of fields.entries()) {
        if (skipFields.has(key)) continue;
        if (key.endsWith("__title")) continue; // skip title fields
        let fieldMeta = await orm.findEntry("fieldMeta", {
          id: `${name}:${key}`,
        });
        if (!fieldMeta) {
          fieldMeta = orm.getNewEntry("fieldMeta");
          fieldMeta.$key = key;
          switch (type) {
            case "entry":
              fieldMeta.$entryMeta = name;
              fieldMeta.$settingsMeta = undefined;
              break;
            case "settings":
              fieldMeta.$entryMeta = undefined;
              fieldMeta.$settingsMeta = name;
              break;
          }
        }
        fieldMeta.$label = field.label || key;
        fieldMeta.$description = field.description;
        fieldMeta.$type = field.type;
        fieldMeta.$required = field.required || false;
        fieldMeta.$readOnly = field.readOnly || false;
        fieldMeta.$unique = field.unique || false;
        fieldMeta.$defaultValue = field.defaultValue !== undefined
          ? field.defaultValue.toString()
          : undefined;
        fieldMeta.$hidden = field.hidden || false;
        fieldMeta.$placeholder = field.placeholder;
        if (field.type === "ConnectionField" && field.entryType) {
          fieldMeta.$entryType = field.entryType;
        }
        if (field.type === "ChoicesField") {
          fieldMeta.$choices.update(field.choices.map((choice) => ({
            key: choice.key,
            label: choice.label,
            color: choice.color as any,
            description: choice.description,
          })));
        } else {
          fieldMeta.$choices.update([]); // clear choices if not a choice field
        }
        await fieldMeta.save();
      }
    };
    for (const entryType of adminRole.entryTypes.values()) {
      if (entryType.config.extension?.key === "core" && this.coreSynced) {
        continue; // skip core entries if core is already synced
      }
      await syncFields(entryType.fields, entryType.name, "entry");
    }
    for (const [key, setting] of adminRole.settingsTypes.entries()) {
      if (setting.config.extension?.key === "core" && this.coreSynced) {
        continue; // skip core settings if core is already synced
      }
      await syncFields(setting.fields, key, "settings");
    }
  }
  async #syncActionMeta(orm: InSpatialORM) {
    const adminRole = orm.roles.getRole("systemAdmin");
    const formatFunction = (funcString: string) => {
      const regex = /action[^\)]+[^\{]+\{(.*)\}$/s;
      const match = funcString.match(regex);
      if (match) {
        let smallesSpaceCount = Infinity;
        for (const line of match[1].split("\n")) {
          const spaceCount = line.match(/^\s*/)?.[0].length || 0;
          if (spaceCount < smallesSpaceCount && line.trim().length > 0) {
            smallesSpaceCount = spaceCount;
          }
        }
        funcString = match[1].split("\n").map((l) => l.slice(smallesSpaceCount))
          .filter((l) => l.trim().length > 0)
          .join("\n");
      }

      return funcString;
    };
    const syncActions = async (
      actions: Map<string, EntryActionDefinition | SettingsActionDefinition>,
      name: string,
      type: "entry" | "settings",
    ) => {
      for (const [key, action] of actions.entries()) {
        let actionMeta = await orm.findEntry("actionMeta", {
          id: `${name}:${key}`,
        });
        if (!actionMeta) {
          actionMeta = orm.getNewEntry("actionMeta");
          actionMeta.$key = key;
          switch (type) {
            case "entry":
              actionMeta.$entryMeta = name;
              actionMeta.$settingsMeta = undefined;
              break;
            case "settings":
              actionMeta.$entryMeta = undefined;
              actionMeta.$settingsMeta = name;
              break;
          }
        }
        actionMeta.$label = action.label || convertString(key, "title", true);
        actionMeta.$description = action.description;
        actionMeta.$private = action.private || false;
        const code = formatFunction(action.action.toString());
        if (code.length > 0) {
          actionMeta.$code = code;
        }

        if (action.params) {
          actionMeta.$parameters.update(
            action.params.map((param) => ({
              ...param,
            })) as any[],
          );
        }
        await actionMeta.save();
      }
    };
    for (const entryType of adminRole.entryTypes.values()) {
      if (entryType.config.extension?.key === "core" && this.coreSynced) {
        continue; // skip core entries if core is already synced
      }
      await syncActions(entryType.actions, entryType.name, "entry");
    }
    for (const [key, setting] of adminRole.settingsTypes.entries()) {
      if (setting.config.extension?.key === "core" && this.coreSynced) {
        continue; // skip core settings if core is already synced
      }
      await syncActions(setting.actions, key, "settings");
    }
  }
  async #deleteObsoleteMeta(orm: InSpatialORM) {
    const adminRole = orm.roles.getRole("systemAdmin");
    const entryNames = new Set<string>();
    const actionKeys = new Set<string>();
    for (const entryType of adminRole.entryTypes.values()) {
      entryNames.add(entryType.name);
      for (const actionName of entryType.actions.keys()) {
        actionKeys.add(`${entryType.name}:${actionName}`);
      }
    }
    const settingsNames = new Set<string>();
    for (const settingsType of adminRole.settingsTypes.values()) {
      settingsNames.add(settingsType.name);
      for (const actionName of settingsType.actions.keys()) {
        actionKeys.add(`${settingsType.name}:${actionName}`);
      }
    }

    const entryMetaFilter: InFilter = {
      field: "entryMeta",
      and: [{
        op: "notInList",
        value: Array.from(entryNames),
      }, {
        op: "isNotEmpty",
      }],
    };
    const settingsMetaFilter: InFilter = {
      field: "settingsMeta",
      and: [{
        op: "notInList",
        value: Array.from(settingsNames),
      }, {
        op: "isNotEmpty",
      }],
    };
    const entrySettingsOrFilter: ListOptions["orFilter"] = [
      entryMetaFilter,
      settingsMetaFilter,
    ];
    const deleteEntries = async (
      entryType: EntryName,
      listOptions: ListOptions,
    ) => {
      const { rows: entries } = await orm.getEntryList(entryType, {
        ...listOptions,
        columns: ["id"],
      });
      for (const { id } of entries) {
        await orm.deleteEntry(entryType, id).catch((e) => {
          this.inLog.error(`Error deleting ${entryType} ${id}: ${e.message}`, {
            stackTrace: e.stack,
          });
        });
      }
    };
    const { rows: fieldMetas } = await orm.getEntryList(
      "fieldMeta",
      { orFilter: entrySettingsOrFilter, columns: ["id"] },
    );
    const fieldMetaIds = fieldMetas.map((f) => f.id);
    if (fieldMetaIds.length > 0) {
      for (
        const table of [
          "childEntryPermissionFieldPermissions",
          "childSettingsPermissionFieldPermissions",
        ]
      ) {
        await orm.db.deleteRows(table, [{
          field: "field",
          op: "inList",
          value: fieldMetaIds,
        }]);
      }
    }

    for (
      const table of [
        "childEntryPermissionActionPermissions",
        "childSettingsPermissionActionPermissions",
      ]
    ) {
      await orm.db.deleteRows(table, [{
        field: "action",
        op: "notInList",
        value: Array.from(actionKeys),
      }]);
    }

    await deleteEntries("entryPermission", { filter: [entryMetaFilter] });
    await deleteEntries("settingsPermission", { filter: [settingsMetaFilter] });
    await deleteEntries("fieldMeta", {
      columns: ["id"],
      orFilter: entrySettingsOrFilter,
    });
    await deleteEntries("actionMeta", {
      columns: ["id"],
      orFilter: [{
        field: "id",
        op: "notInList",
        value: Array.from(actionKeys),
      }, ...entrySettingsOrFilter],
    });
    await deleteEntries("entryMeta", {
      columns: ["id"],
      filter: [{
        field: "id",
        op: "notInList",
        value: Array.from(entryNames),
      }],
    });

    await deleteEntries("settingsMeta", {
      columns: ["id"],
      filter: [{
        field: "id",
        op: "notInList",
        value: Array.from(settingsNames),
      }],
    });
  }
  async #syncRoles(orm: InSpatialORM) {
    for (const [roleName, role] of this.roles.roles.entries()) {
      if (roleName === "systemAdmin") {
        continue;
      }
      let roleModel = await orm.findEntry("userRole", {
        id: roleName,
      });
      if (!roleModel) {
        roleModel = orm.getNewEntry("userRole");
        roleModel.$roleKey = roleName;
      }
      roleModel.$roleName = role.label;
      roleModel.$extendsRole = role.extendsRole;
      await roleModel.save();
      await this.#syncRoleEntryPermissions(orm, roleName);
      await this.#syncRoleSettingsPermissions(orm, roleName);
      await this.#syncRoleApiPermissions(orm, roleName);
    }
  }
  async #syncRoleEntryPermissions(orm: InSpatialORM, roleName: string) {
    const role = this.roles.getRole(roleName);
    for (const [entryTypeName, entryPerm] of role.entryPermissions.entries()) {
      let entryPermModel = await orm.findEntry("entryPermission", {
        userRole: roleName,
        entryMeta: entryTypeName,
      });
      if (!entryPermModel) {
        entryPermModel = orm.getNewEntry("entryPermission");
        entryPermModel.$userRole = roleName;
        entryPermModel.$entryMeta = entryTypeName;
      }
      entryPermModel.$canView = entryPerm.view || false;
      entryPermModel.$canModify = entryPerm.modify || false;
      entryPermModel.$canCreate = entryPerm.create || false;
      entryPermModel.$canDelete = entryPerm.delete || false;
      entryPermModel.$userScope = entryPerm.userScope
        ? `${entryTypeName}:${entryPerm.userScope}`
        : undefined;
      const includedActions = new Set(
        entryPerm.actions?.include || [],
      );
      const excludedActions = new Set(
        entryPerm.actions?.exclude || [],
      );
      if (includedActions.size > 0 || excludedActions.size > 0) {
        entryPermModel.$allowAllActions = false;

        entryPermModel.$actionPermissions.update(
          entryPerm.actions?.include?.map((actionName) => ({
            action: `${entryTypeName}:${actionName}`,
            canExecute: true,
          })) || [],
        );
      }

      if (entryPerm.fields) {
        const fieldPerms = [];
        for (
          const [fieldName, permission] of Object.entries(entryPerm.fields)
        ) {
          if (!permission) {
            continue;
          }
          fieldPerms.push({
            field: `${entryTypeName}:${fieldName}`,
            canView: !!permission.view,
            canModify: !!permission.modify,
          });
        }
        entryPermModel.$fieldPermissions.update(fieldPerms);
      }

      await entryPermModel.save();
    }
  }
  async #syncRoleSettingsPermissions(orm: InSpatialORM, roleName: string) {
    const role = this.roles.getRole(roleName);
    for (const [settingsTypeName, settingsPerm] of role.settingsPermissions) {
      let settingsPermModel = await orm.findEntry("settingsPermission", {
        userRole: roleName,
        settingsMeta: settingsTypeName,
      });
      if (!settingsPermModel) {
        settingsPermModel = orm.getNewEntry("settingsPermission");
        settingsPermModel.$userRole = roleName;
        settingsPermModel.$settingsMeta = settingsTypeName;
      }
      settingsPermModel.$canView = settingsPerm.view || false;
      settingsPermModel.$canModify = settingsPerm.modify || false;

      const includedActions = new Set(
        settingsPerm.actions?.include || [],
      );
      const excludedActions = new Set(
        settingsPerm.actions?.exclude || [],
      );
      if (includedActions.size > 0 || excludedActions.size > 0) {
        settingsPermModel.$allowAllActions = false;

        settingsPermModel.$actionPermissions.update(
          settingsPerm.actions?.include?.map((actionName) => ({
            action: `${settingsTypeName}:${actionName}`,
            canExecute: true,
          })) || [],
        );
      }

      if (settingsPerm.fields) {
        const fieldPerms = [];
        for (
          const [fieldName, permission] of Object.entries(settingsPerm.fields)
        ) {
          if (!permission) {
            continue;
          }
          fieldPerms.push({
            field: `${settingsTypeName}:${fieldName}`,
            canView: !!permission.view,
            canModify: !!permission.modify,
          });
        }
        settingsPermModel.$fieldPermissions.update(fieldPerms);
      }

      await settingsPermModel.save();
    }
  }
  async #syncRoleApiPermissions(orm: InSpatialORM, roleName: string) {
    const role = this.roles.getRole(roleName);
    for (const [groupName, groupPerm] of role.apiGroups.entries()) {
      let apiGroupPermModel = await orm.findEntry("apiGroupPermission", {
        userRole: roleName,
        apiGroup: groupName,
      });
      if (!apiGroupPermModel) {
        apiGroupPermModel = orm.getNewEntry("apiGroupPermission");
        apiGroupPermModel.$userRole = roleName;
        apiGroupPermModel.$apiGroup = groupName;
      }
      apiGroupPermModel.$canAccess = true;
      apiGroupPermModel.$accessAll = groupPerm === true;
      const existingActions = new Set(
        apiGroupPermModel.$actions.data.map((a) => a.apiAction),
      );
      const newActions = [];
      if (groupPerm !== true) {
        for (const actionName of groupPerm) {
          const actionId = `${groupName}:${actionName}`;
          newActions.push({
            id: `${apiGroupPermModel.id}:${actionId}`,
            apiAction: actionId,
            canAccess: true,
          });
        }
        for (const existingAction of existingActions) {
          if (!groupPerm.has(existingAction.split(":").pop()!)) {
            newActions.push({
              id: `${apiGroupPermModel.id}:${existingAction}`,
              apiAction: existingAction,
              canAccess: false,
            });
          }
        }
        apiGroupPermModel.$actions.update(newActions);
      }

      await apiGroupPermModel.save();
    }
  }

  async #syncApiGroups(orm: InSpatialORM) {
    const syncAction = async (action: CloudAPIAction, groupName: string) => {
      let model = await orm.findEntry("apiAction", {
        id: `${groupName}:${action.actionName}`,
      });
      if (!model) {
        model = orm.getNewEntry("apiAction");
        model.$actionName = action.actionName;
        model.$apiGroup = groupName;
      }
      model.$label = action.label ||
        convertString(action.actionName, "title", true);
      model.$description = action.description;
      model.$authRequired = !!action.authRequired;
      model.$code = action.run.toString();
      model.$hideFromApi = !action.includeInAPI;
      model.$raw = !!action.raw;
      const params: any = [];
      for (const param of action.params.values()) {
        params.push({
          id: `${model.id}${param.key}`,
          ...param,
          label: param.label ||
            convertString(param.key as string, "title", true),
        });
      }
      model.$parameters.update(params);
      await model.save();
    };
    const syncGroup = async (group: CloudAPIGroup, extension: string) => {
      let model = await orm.findEntry("apiGroup", {
        id: group.groupName,
      });
      if (!model) {
        model = orm.getNewEntry("apiGroup");
        model.$groupName = group.groupName;
      }
      model.$label = group.label ||
        convertString(group.groupName, "title", true);
      model.$description = group.description;
      model.$extensionMeta = extension;
      await model.save();
      for (const action of group.actions.values()) {
        await syncAction(action, group.groupName);
      }
    };
    const apiGroup = this.api.actionGroups.get("api");
    if (apiGroup) {
      await syncGroup(apiGroup, "core");
    }
    const groupNames = new Set<string>(["api"]);
    for (const [key, extension] of this.extensionManager.extensions.entries()) {
      for (const group of extension.apiGroups) {
        groupNames.add(group.groupName);
        await syncGroup(group, key);
      }
    }
    const { rows: actions } = await orm.getEntryList("apiAction", {
      columns: ["id"],
      filter: [
        { field: "apiGroup", op: "notInList", value: Array.from(groupNames) },
      ],
    });
    for (const { id } of actions) {
      await orm.deleteEntry("apiAction", id);
    }
    const { rows: groups } = await orm.getEntryList("apiGroup", {
      columns: ["id"],
      filter: [
        { field: "id", op: "notInList", value: Array.from(groupNames) },
      ],
    });
    for (const { id } of groups) {
      await orm.deleteEntry("apiGroup", id);
    }
  }

  async #migrateAccounts() {
    const { rows: accounts } = await this.orm.getEntryList(
      "account",
      { columns: ["id"], filter: { initialized: true }, limit: 0 },
    );
    for (const { id } of accounts) {
      await this.orm.migrate(id);
    }
  }
}
