import { EntryType } from "../../../orm/entry/entry-type.ts";
import convertString from "../../../utils/convert-string.ts";
import type { RoleConfig } from "../../../orm/roles/role.ts";
import { ORMException } from "../../../orm/orm-exception.ts";

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
  },
});

userRole.addAction({
  key: "generateConfig",
  label: "Generate Config",
  description: "Generate the role configuration as a JSON object",
  params: [],
  async action({ userRole, orm, inCloud }) {
    const { rows } = await orm.getEntryList(
      "entryPermission",
      {
        filter: {
          userRole: userRole.$id,
        },
        columns: [
          "id",
        ],
      },
    );
    const roleConfig: RoleConfig = {
      roleName: userRole.$roleKey,
      description: userRole.$description || "",
      label: userRole.$roleName,
      entryTypes: {},
      settingsTypes: {},
      apiGroups: {},
    };
    for (const { id } of rows) {
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
    const { rows: apiGroups } = await orm.getEntryList(
      "apiGroupPermission",
      {
        filter: {
          userRole: userRole.$id,
        },
        columns: [
          "id",
        ],
      },
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
