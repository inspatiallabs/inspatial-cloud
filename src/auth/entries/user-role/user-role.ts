import type { UserRole } from "./_user-role.type.ts";
import { ChildEntryType } from "../../../orm/child-entry/child-entry.ts";
import { EntryType } from "../../../orm/entry/entry-type.ts";
import convertString from "../../../utils/convert-string.ts";

const entryPermission = new ChildEntryType("entryPermission", {
  fields: [{
    key: "entryType",
    label: "",
    type: "ConnectionField",
    entryType: "entryMeta",
  }],
});
export const userRole = new EntryType<UserRole>("userRole", {
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
  children: [entryPermission],
  hooks: {
    beforeValidate: [{
      name: "setRoleKey",
      handler({ userRole }) {
        if (!userRole.roleKey) {
          const roleName = userRole.roleName;
          userRole.roleKey = convertString(
            roleName.replace(/[^a-zA-Z]/g, ""),
            "camel",
            true,
          );
        }
      },
    }],
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
