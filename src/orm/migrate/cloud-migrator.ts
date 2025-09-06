import { InCloud } from "~/in-cloud.ts";
import type { InSpatialORM } from "../mod.ts";
import type { CloudAPIGroup } from "../../api/cloud-group.ts";
import convertString from "../../utils/convert-string.ts";
import type { CloudAPIAction } from "@inspatial/cloud";
import type { ApiAction } from "@inspatial/cloud/models";

export class InCloudMigrator extends InCloud {
  constructor(appName: string, config: any) {
    super(appName, config, "migrator");
  }
  async migrate(): Promise<void> {
    await this.#migrateGlobal();
    await this.#migrateAccounts();
  }

  async #migrateGlobal() {
    const orm = this.orm.withUser(this.orm.systemGobalUser);

    await orm.migrateGlobal();
    await this.#syncExtensionModels(orm);
    await this.#syncDatabaseEntryModels(orm);
    await this.#syncSettingsModels(orm);
    await this.#syncApiGroups(orm);
    await this.#syncRoles(orm);
    for (const migrateAction of this.extensionManager.afterMigrate.global) {
      await migrateAction.action({
        inCloud: this,
        orm,
      });
    }
  }
  async #syncExtensionModels(orm: InSpatialORM) {
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
  async #syncDatabaseEntryModels(orm: InSpatialORM) {
    const adminRole = orm.roles.getRole("systemAdmin"); // ensure admin role exists
    const entryNames = new Set<string>();
    for (const entryType of adminRole.entryTypes.values()) {
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
      model.$description = entryType.description || "";
      model.$titleField = entryType.config.titleField || "";
      model.$extension = entryType.config.extension?.key || "";

      const hooks = Object.entries(entryType.hooks).flatMap((
        [hookName, hookDefs],
      ) =>
        hookDefs.map((hookDef) => ({
          hook: hookName,
          name: hookDef.name,
          description: hookDef.description || "",
          handler: hookDef.handler.toString(),
          active: true,
        }))
      );
      model.$hooks.update(hooks as any[]);

      await model.save();
    }
    await orm.db.deleteRows("entryFieldMeta", [{
      field: "entryMeta",
      op: "notInList",
      value: Array.from(entryNames),
    }]);
    await orm.db.deleteRows("entryEntryAction", [{
      field: "entryMeta",
      op: "notInList",
      value: Array.from(entryNames),
    }]);
    await orm.db.deleteRows("entryEntryMeta", [{
      field: "id",
      op: "notInList",
      value: Array.from(entryNames),
    }]);

    await this.#syncFieldMeta(orm);
    await this.#syncEntryActionMeta(orm);
  }
  async #syncFieldMeta(orm: InSpatialORM) {
    const adminRole = orm.roles.getRole("systemAdmin");
    const skipFields = new Set<string>([
      "id",
      "createdAt",
      "updatedAt",
      "in__tags",
    ]);
    for (const entryType of adminRole.entryTypes.values()) {
      for (const [key, field] of entryType.fields.entries()) {
        if (skipFields.has(key)) continue;
        if (key.endsWith("__title")) continue; // skip title fields
        let fieldMeta = await orm.findEntry("fieldMeta", {
          id: `${entryType.name}:${key}`,
        });
        if (!fieldMeta) {
          fieldMeta = orm.getNewEntry("fieldMeta");
          fieldMeta.$key = key;
          fieldMeta.$entryMeta = entryType.name;
        }
        fieldMeta.$label = field.label || key;
        fieldMeta.$description = field.description || "";
        fieldMeta.$type = field.type;
        fieldMeta.$required = field.required || false;
        fieldMeta.$readOnly = field.readOnly || false;
        fieldMeta.$unique = field.unique || false;
        fieldMeta.$defaultValue = field.defaultValue;
        fieldMeta.$hidden = field.hidden || false;
        fieldMeta.$placeholder = field.placeholder || "";
        if (field.type === "ConnectionField" && field.entryType) {
          fieldMeta.$entryType = field.entryType;
        }
        if (field.type === "ChoicesField") {
          fieldMeta.$choices.update(field.choices.map((choice) => ({
            key: choice.key,
            label: choice.label,
            color: choice.color as any,
            description: choice.description || "",
          })));
        } else {
          fieldMeta.$choices.update([]); // clear choices if not a choice field
        }
        await fieldMeta.save();
      }
    }
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
      await roleModel.save();
      for (const [entryTypeName, entryPerm] of role.entryPermissions) {
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
        const existingActions = entryPermModel.$actionPermissions.data;
        for (const actionName of entryPerm.actions?.include || []) {
          const existing = existingActions.find((a) =>
            a.action === `${entryTypeName}:${actionName}`
          );
          if (existing) {
            existing.canExecute = true;
            continue;
          }

          existingActions.push({
            action: `${entryTypeName}:${actionName}`,
            canExecute: true,
          });
        }

        entryPermModel.$actionPermissions.update(existingActions);
        await entryPermModel.save();
      }
    }
  }
  async #syncEntryActionMeta(orm: InSpatialORM) {
    const adminRole = orm.roles.getRole("systemAdmin");
    for (const entryType of adminRole.entryTypes.values()) {
      for (const [key, action] of entryType.actions.entries()) {
        let actionMeta = await orm.findEntry("entryAction", {
          id: `${entryType.name}:${key}`,
        });
        if (!actionMeta) {
          actionMeta = orm.getNewEntry("entryAction");
          actionMeta.$key = key;
          actionMeta.$entryMeta = entryType.name;
        }
        actionMeta.$label = action.label || key;
        actionMeta.$description = action.description || "";
        actionMeta.$private = action.private || false;
        actionMeta.$code = action.action.toString();

        if (action.params) {
          actionMeta.$parameters.update(action.params as any[]);
        }
        await actionMeta.save();
      }
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
      model.$description = action.description || "";
      model.$authRequired = !!action.authRequired;
      model.$code = action.run.toString();
      model.$hideFromApi = !action.includeInAPI;
      model.$raw = !!action.raw;
      const params: any = [];
      for (const param of action.params.values()) {
        params.push({
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
      model.$description = group.description || "";
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
      for (const group of extension.actionGroups) {
        groupNames.add(group.groupName);
        await syncGroup(group, key);
      }
    }
    const { rows: actions } = await orm.getEntryList("apiAction", {
      columns: ["id"],
      filter: [{
        field: "apiGroup",
        op: "notInList",
        value: Array.from(groupNames),
      }],
    });
    for (const { id } of actions) {
      await orm.deleteEntry("apiAction", id);
    }
    const { rows: groups } = await orm.getEntryList("apiGroup", {
      columns: ["id"],
      filter: [{
        field: "id",
        op: "notInList",
        value: Array.from(groupNames),
      }],
    });
    for (const { id } of groups) {
      await orm.deleteEntry("apiGroup", id);
    }
  }
  async #syncSettingsModels(orm: InSpatialORM) {
    this.inLog.warn(
      "Settings sync sync not implemented yet.",
    );
  }
  async #migrateAccounts() {
    const { rows: accounts } = await this.orm.getEntryList(
      "account",
      {
        columns: ["id"],
        filter: {
          initialized: true,
        },
        limit: 0,
      },
    );
    for (const { id } of accounts) {
      await this.orm.migrate(id);
    }
  }
}
