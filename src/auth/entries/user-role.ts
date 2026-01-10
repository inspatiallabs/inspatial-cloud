import { EntryType } from "../../orm/entry/entry-type.ts";
import convertString from "../../utils/convert-string.ts";
import type { RoleConfig } from "../../orm/roles/role.ts";
import { ORMException, raiseORMException } from "../../orm/orm-exception.ts";
import type { ListOptions } from "../../orm/db/db-types.ts";
import type { EntryName } from "#types/models.ts";
import type { EntryPermission } from "../../orm/roles/entry-permissions.ts";
import type { SettingsPermission } from "../../orm/roles/settings-permissions.ts";
import { defineEntry } from "../../orm/mod.ts";

export const userRole = defineEntry("userRole", {
  titleField: "roleName",
  description: "A role assignable to a user",
  systemGlobal: true,
  idMode: {
    type: "field",
    field: "roleKey",
  },
  fields: [{
    key: "roleKey",
    type: "DataField",
    hidden: true,
    readOnly: true,
  }, {
    key: "roleName",
    type: "DataField",
    required: true,
  }, {
    key: "extendsRole",
    type: "ConnectionField",
    entryType: "userRole",
    description: "The role this role extends",
  }, {
    key: "description",
    type: "TextField",
    description: "A short descriptions of the role",
  }],
  hooks: {
    beforeValidate: [{
      name: "setRoleKey",
      handler({ userRole }) {
        if (!userRole.$roleKey) {
          const roleName = userRole.$roleName;
          userRole.$roleKey = convertString(
            roleName.replace(/[^a-zA-Z]/g, ""),
            "camel",
            true,
          );
        }
      },
    }],
    validate: [{
      name: "noSelfExtend",
      handler({ userRole }) {
        if (userRole.$extendsRole && userRole.$extendsRole === userRole.$id) {
          raiseORMException("A role cannot extend itself.", "userRole", 400);
        }
      },
    }],
    beforeDelete: [{
      name: "removeRelatedPermissions",
      async handler({ orm, userRole }) {
        const entries: Array<EntryName> = [
          "entryPermission",
          "settingsPermission",
          "apiGroupPermission",
        ];

        for (const entry of entries) {
          const { rows } = await orm.getEntryList(
            entry,
            {
              filter: {
                userRole: userRole.$id,
              },
              columns: ["id"],
            },
          );
          for (const { id } of rows) {
            await orm.deleteEntry(entry, id);
          }
        }
      },
    }],
  },
});
userRole.addAction("syncWithSystem", {
  label: "Sync with System Roles",
  async action({ userRole, inCloud }) {
    throw new Error("stop! this is not implemented properly yet");
    // const roleConfig = await userRole.runAction("generateConfig") as RoleConfig;
    // try {
    //   inCloud.roles.updateRole(roleConfig);
    // } catch (e) {
    //   if (e instanceof ORMException) {
    //     inCloud.inLog.warn("Role Setup: " + e.message, {
    //       compact: true,
    //       subject: e.subject,
    //     });
    //     return;
    //   }
    //   throw e;
    // }
  },
});
userRole.addAction("generateConfig", {
  label: "Generate Config",
  description: "Generate the role configuration as a JSON object",
  private: false,
  async action({ userRole, orm }) {
    throw new Error("stop! this is not implemented properly yet");
    // const roleConfig: RoleConfig = {
    //   roleName: userRole.$roleKey,
    //   description: userRole.$description,
    //   label: userRole.$roleName,
    //   entryTypes: {},
    //   settingsTypes: {},
    //   apiGroups: {},
    // };
    // const entryTypes = new Map<string, EntryPermission>();
    // const settingsTypes = new Map<string, SettingsPermission>();
    // const apiGroups = new Map<string, string[] | true>();
    // if (userRole.$extendsRole) {
    //   const parentRole = await orm.getEntry("userRole", userRole.$extendsRole);
    //   const parentConfig = await parentRole.runAction(
    //     "generateConfig",
    //   ) as RoleConfig;
    //   if (parentConfig.entryTypes) {
    //     for (
    //       const [key, entryPerm] of Object.entries(parentConfig.entryTypes)
    //     ) {
    //       entryTypes.set(key, entryPerm);
    //     }
    //   }
    //   if (parentConfig.settingsTypes) {
    //     for (
    //       const [key, settingsPerm] of Object.entries(
    //         parentConfig.settingsTypes,
    //       )
    //     ) {
    //       settingsTypes.set(key, settingsPerm);
    //     }
    //   }
    //   if (parentConfig.apiGroups) {
    //     for (const [key, apiPerm] of Object.entries(parentConfig.apiGroups)) {
    //       apiGroups.set(key, apiPerm);
    //     }
    //   }
    // }

    // const listOptions: ListOptions = {
    //   filter: {
    //     userRole: userRole.$id,
    //   },
    //   columns: [
    //     "id",
    //   ],
    // };
    // const { rows: entryPermissions } = await orm.getEntryList(
    //   "entryPermission",
    //   listOptions,
    // );

    // for (const { id } of entryPermissions) {
    //   const perm = await orm.getEntry("entryPermission", id);
    //   const existing = entryTypes.get(perm.$entryMeta);
    //   const entryPermission: EntryPermission = {
    //     ...existing,
    //     create: perm.$canCreate,
    //     delete: perm.$canDelete,
    //     modify: perm.$canModify,
    //     view: perm.$canView,
    //     userScope: perm.$userScope?.split(":").pop() || existing?.userScope,
    //     actions: {
    //       include: perm.$actionPermissions.data.filter((action) =>
    //         action.canExecute
    //       ).map((action) => action.action.split(":").pop()!),
    //       exclude: perm.$actionPermissions.data.filter((action) =>
    //         !action.canExecute
    //       ).map((action) => action.action.split(":").pop()!),
    //     },
    //   };

    //   if (perm.$fieldPermissions.count > 0) {
    //     if (!entryPermission.fields) {
    //       entryPermission.fields = {};
    //     }
    //     for (const field of perm.$fieldPermissions.data) {
    //       entryPermission.fields[field.field.split(":").pop()!] = {
    //         view: !!field.canView,
    //         modify: !!field.canModify,
    //       };
    //     }
    //   }

    //   entryTypes.set(perm.$entryMeta, entryPermission);
    // }
    // roleConfig.entryTypes = Object.fromEntries(entryTypes);
    // const { rows: settingsPermissions } = await orm.getEntryList(
    //   "settingsPermission",
    //   listOptions,
    // );
    // for (const { id } of settingsPermissions) {
    //   const perm = await orm.getEntry("settingsPermission", id);
    //   const existing = settingsTypes.get(perm.$settingsMeta);
    //   if (!roleConfig.settingsTypes) {
    //     roleConfig.settingsTypes = {};
    //   }
    //   const settingsPermission: SettingsPermission = {
    //     ...existing,
    //     modify: perm.$canModify,
    //     view: perm.$canView,
    //     actions: {
    //       include: perm.$actionPermissions.data.filter((action) =>
    //         action.canExecute
    //       ).map((action) => action.action.split(":").pop()!),
    //       exclude: perm.$actionPermissions.data.filter((action) =>
    //         !action.canExecute
    //       ).map((action) => action.action.split(":").pop()!),
    //     },
    //   };
    //   if (perm.$fieldPermissions.count > 0) {
    //     if (!settingsPermission.fields) {
    //       settingsPermission.fields = {};
    //     }
    //     for (const field of perm.$fieldPermissions.data) {
    //       settingsPermission["fields"][field.field.split(":").pop()!] = {
    //         view: !!field.canView,
    //         modify: !!field.canModify,
    //       };
    //     }
    //   }
    //   settingsTypes.set(perm.$settingsMeta, settingsPermission);
    // }
    // roleConfig.settingsTypes = Object.fromEntries(settingsTypes);
    // const { rows: apiGroupPermissions } = await orm.getEntryList(
    //   "apiGroupPermission",
    //   listOptions,
    // );
    // for (const { id } of apiGroupPermissions) {
    //   const perm = await orm.getEntry("apiGroupPermission", id);

    //   const accessActions = perm.$actions.data.filter((
    //     action,
    //   ) => action.canAccess).map((
    //     action,
    //   ) => action.apiAction.split(":").pop()!);
    //   apiGroups.set(perm.$apiGroup, perm.$accessAll ? true : accessActions);
    // }
    // roleConfig.apiGroups = Object.fromEntries(apiGroups);

    // return roleConfig;
  },
});

/**
 * ```ts
 * {
   roleName: "accountOwner",
   label: "Account Owner",
   description: "The default role assigned to a user",
   entryTypes: {
     cloudFile: {
       view: true,
       modify: true,
       create: true,
       delete: true,
     },
     globalCloudFile: {
       view: true,
       modify: false,
       create: false,
       delete: false,
     },
     onboardingStep: {
       view: true,
       modify: false,
       create: false,
       delete: false,
     },
     emailTemplate: {
       view: true,
       modify: false,
       create: false,
       delete: false,
     },
     user: {
       view: true,
       modify: false,
       create: false,
       delete: false,
       userScoped: {
         userIdField: "id",
       },
       fields: {
         systemAdmin: {
           view: false,
           modify: false,
         },
         enabled: {
           view: false,
           modify: false,
         },
         firstName: {
           modify: true,
           view: true,
         },
         lastName: {
           modify: true,
           view: true,
         },
       },
       actions: {
         include: [],
       },
     },
   },
 }
  * ```
 */
