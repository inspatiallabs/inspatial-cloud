import { EntryType } from "../../orm/entry/entry-type.ts";
import convertString from "../../utils/convert-string.ts";
import type { RoleConfig } from "../../orm/roles/role.ts";
import { ORMException, raiseORMException } from "../../orm/orm-exception.ts";
import type { ListOptions } from "../../orm/db/db-types.ts";
import type { EntryName } from "@inspatial/cloud/models";

export const userRole = new EntryType("userRole", {
  titleField: "roleName",
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
    description: "A short description of the role",
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

userRole.addAction({
  key: "generateConfig",
  label: "Generate Config",
  description: "Generate the role configuration as a JSON object",
  private: true,
  params: [],
  async action({ userRole, orm, inCloud }) {
    const roleConfig: RoleConfig = {
      roleName: userRole.$roleKey,
      description: userRole.$description || "",
      label: userRole.$roleName,
      entryTypes: {},
      settingsTypes: {},
      apiGroups: {},
    };
    const listOptions: ListOptions = {
      filter: {
        userRole: userRole.$id,
      },
      columns: [
        "id",
      ],
    };
    const { rows: entryPermissions } = await orm.getEntryList(
      "entryPermission",
      listOptions,
    );

    for (const { id } of entryPermissions) {
      const perm = await orm.getEntry("entryPermission", id);
      const entryPermission: Record<string, any> = {
        create: perm.$canCreate,
        delete: perm.$canDelete,
        modify: perm.$canModify,
        view: perm.$canView,
        actions: {
          include: perm.$actionPermissions.data.filter((action) =>
            action.canExecute
          ).map((action) => action.action.split(":").pop()!),
          exclude: perm.$actionPermissions.data.filter((action) =>
            !action.canExecute
          ).map((action) => action.action.split(":").pop()!),
        },
      };

      if (perm.$fieldPermissions.count > 0) {
        entryPermission["fields"] = {};
        for (const field of perm.$fieldPermissions.data) {
          entryPermission["fields"][field.field.split(":").pop()!] = {
            view: !!field.canView,
            modify: !!field.canModify,
          };
        }
      }
      roleConfig.entryTypes![perm.$entryMeta] = entryPermission as any;
    }
    const { rows: settingsPermissions } = await orm.getEntryList(
      "settingsPermission",
      listOptions,
    );
    for (const { id } of settingsPermissions) {
      const perm = await orm.getEntry("settingsPermission", id);
      const settingsPermission: Record<string, any> = {
        modify: perm.$canModify,
        view: perm.$canView,
        actions: {
          include: perm.$actionPermissions.data.filter((action) =>
            action.canExecute
          ).map((action) => action.action.split(":").pop()!),
          exclude: perm.$actionPermissions.data.filter((action) =>
            !action.canExecute
          ).map((action) => action.action.split(":").pop()!),
        },
      };
      if (perm.$fieldPermissions.count > 0) {
        settingsPermission["fields"] = {};
        for (const field of perm.$fieldPermissions.data) {
          settingsPermission["fields"][field.field.split(":").pop()!] = {
            view: !!field.canView,
            modify: !!field.canModify,
          };
        }
      }
      roleConfig.settingsTypes![perm.$settingsMeta] = settingsPermission as any;
    }
    const { rows: apiGroups } = await orm.getEntryList(
      "apiGroupPermission",
      listOptions,
    );
    for (const { id } of apiGroups) {
      const perm = await orm.getEntry("apiGroupPermission", id);

      roleConfig.apiGroups![perm.$apiGroup] = perm.$actions.data.filter((
        action,
      ) => action.canAccess).map((
        action,
      ) => action.apiAction.split(":").pop()!);
    }
    try {
      inCloud.roles.updateRole(roleConfig);
    } catch (e) {
      if (e instanceof ORMException) {
        inCloud.inLog.warn("Role Setup: " + e.message, {
          compact: true,
          subject: e.subject,
        });
        return;
      }
      throw e;
    }
    return roleConfig;
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
