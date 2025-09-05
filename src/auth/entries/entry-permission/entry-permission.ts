import { EntryType } from "@inspatial/cloud";
import type { EntryPermission } from "./_entry-permission.type.ts";
import { raiseORMException } from "../../../orm/orm-exception.ts";
import { ChildEntryType } from "../../../orm/child-entry/child-entry.ts";
import { UserRole } from "../user-role/_user-role.type.ts";
const fieldPermission = new ChildEntryType("fieldPermissions", {
  fields: [{
    key: "field",
    label: "",
    type: "ConnectionField",
    required: true,
    entryType: "fieldMeta",
    filterBy: {
      entryMeta: "entryMeta",
    },
  }, {
    key: "canView",
    type: "BooleanField",
  }, {
    key: "canModify",
    type: "BooleanField",
  }],
});
export const entryPermission = new EntryType<EntryPermission>(
  "entryPermission",
  {
    systemGlobal: true,
    description: "Role permissions for a specific entry type",
    defaultListFields: [
      "role",
      "entryMeta",
      "canView",
      "canModify",
      "canCreate",
      "canDelete",
    ],
    fields: [{
      key: "role",
      label: "",
      type: "ConnectionField",
      entryType: "userRole",
      required: true,
      description: "The user role this permission applies to",
    }, {
      key: "entryMeta",
      label: "Entry",
      type: "ConnectionField",
      entryType: "entryMeta",
      required: true,
      description: "The entry type this permission applies to",
    }, {
      key: "canView",
      type: "BooleanField",
      defaultValue: false,
    }, {
      key: "canModify",
      type: "BooleanField",
      defaultValue: false,
    }, {
      key: "canCreate",
      type: "BooleanField",
      defaultValue: false,
    }, {
      key: "canDelete",
      type: "BooleanField",
      defaultValue: false,
    }],
    children: [fieldPermission],
    hooks: {
      validate: [{
        name: "uniqueRoleEntryType",
        description: "Ensure unique role and entry type combination",
        async handler({ entryPermission, orm }) {
          if (!entryPermission.$role || !entryPermission.$entryMeta) return;
          entryPermission;
          const existingId = await orm.findEntryId<EntryPermission>(
            "entryPermission",
            {
              role: entryPermission.$role,
              entryMeta: entryPermission.$entryMeta,
            },
          );
          if (existingId && existingId !== entryPermission.id) {
            raiseORMException(
              `An entry permission for role '${entryPermission.$role}' and entry type '${entryPermission.$entryMeta}' already exists.`,
            );
          }
        },
      }],
      afterUpdate: [{
        name: "syncRoleConfig",
        async handler({ entryPermission, orm }) {
          const userRole = await orm.getEntry<UserRole>(
            "userRole",
            entryPermission.$role,
          );
          userRole.runAction("generateConfig");
        },
      }],
    },
  },
);
