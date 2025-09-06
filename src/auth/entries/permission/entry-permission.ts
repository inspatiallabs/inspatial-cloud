import { EntryType } from "@inspatial/cloud";
import { raiseORMException } from "../../../orm/orm-exception.ts";
import { ChildEntryType } from "../../../orm/child-entry/child-entry.ts";
import type { EntryHookDefinition } from "../../../orm/entry/types.ts";
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
const actionPermission = new ChildEntryType("actionPermissions", {
  label: "Action Permissions",
  fields: [{
    key: "action",
    label: "",
    type: "ConnectionField",
    required: true,
    entryType: "entryAction",
    filterBy: {
      entryMeta: "entryMeta",
    },
  }, {
    key: "canExecute",
    type: "BooleanField",
  }],
});

const syncRoleConfig: EntryHookDefinition<"entryPermission"> = {
  name: "syncRoleConfig",
  async handler({ entryPermission, orm }) {
    const userRole = await orm.getEntry(
      "userRole",
      entryPermission.$userRole,
    );
    userRole.runAction("generateConfig");
  },
};
export const entryPermission = new EntryType(
  "entryPermission",
  {
    systemGlobal: true,
    description: "Role permissions for a specific entry type",
    defaultListFields: [
      "userRole",
      "entryMeta",
      "canView",
      "canModify",
      "canCreate",
      "canDelete",
    ],
    fields: [{
      key: "userRole",
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
      defaultValue: true,
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
    }, {
      key: "allowAllActions",
      type: "BooleanField",
      defaultValue: true,
    }],
    children: [fieldPermission, actionPermission],
    hooks: {
      validate: [{
        name: "uniqueRoleEntryType",
        description: "Ensure unique role and entry type combination",
        async handler({ entryPermission, orm }) {
          if (!entryPermission.$userRole || !entryPermission.$entryMeta) return;
          entryPermission;
          const existingId = await orm.findEntryId(
            "entryPermission",
            {
              userRole: entryPermission.$userRole,
              entryMeta: entryPermission.$entryMeta,
            },
          );
          if (existingId && existingId !== entryPermission.id) {
            raiseORMException(
              `An entry permission for role '${entryPermission.$userRole}' and entry type '${entryPermission.$entryMeta}' already exists.`,
            );
          }
        },
      }, {
        name: "ensureUniqeFieldMeta",
        handler({ entryPermission }) {
          const fields = entryPermission.$fieldPermissions.data.map((fp) =>
            fp.field
          );
          const duplicates = fields.filter((f, index) =>
            fields.indexOf(f) !== index
          );
          if (duplicates.length > 0) {
            raiseORMException(
              `Duplicate field permissions for fields: ${
                [...new Set(duplicates)].join(
                  ", ",
                )
              }`,
            );
          }
        },
      }, {
        name: "ensureUniqueActionMeta",
        handler({ entryPermission }) {
          const actions = entryPermission.$actionPermissions.data.map((ap) =>
            ap.action
          );
          const duplicates = actions.filter((a, index) =>
            actions.indexOf(a) !== index
          );
          if (duplicates.length > 0) {
            raiseORMException(
              `Duplicate action permissions for actions: ${
                [...new Set(duplicates)].join(
                  ", ",
                )
              }`,
            );
          }
        },
      }],
      beforeUpdate: [{
        name: "setActions",
        async handler({ entryPermission, orm }) {
          const { rows: actions } = await orm.getEntryList("entryAction", {
            filter: {
              entryMeta: entryPermission.$entryMeta,
            },
            columns: ["id"],
            limit: 0,
          });
          if (entryPermission.$allowAllActions) {
            entryPermission.$actionPermissions.update(actions.map((a) => ({
              action: a.id,
              canExecute: true,
            })));
            return;
          }
          const currentActions = entryPermission.$actionPermissions.data.map(
            (ap) => ap.action,
          );
          const newActions = actions.filter((a) =>
            !currentActions.includes(a.id)
          );
          if (newActions.length > 0) {
            entryPermission.$actionPermissions.update([
              ...newActions.map((a) => ({
                action: a.id,
                canExecute: false,
              })),
              ...entryPermission.$actionPermissions.data,
            ]);
          }
        },
      }],
      afterUpdate: [syncRoleConfig],
      afterDelete: [syncRoleConfig],
      afterCreate: [syncRoleConfig],
    },
  },
);
