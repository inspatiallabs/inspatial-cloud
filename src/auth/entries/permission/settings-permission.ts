import { raiseORMException } from "~/orm/orm-exception.ts";
import { defineChildEntry } from "~/orm/child-entry/child-entry.ts";
// import type { EntryHookDefinition } from "~/orm/entry/types.ts";
import { defineEntry } from "~/orm/entry/entry-type.ts";
const fieldPermission = defineChildEntry("fieldPermissions", {
  idMode: {
    type: "fields",
    fields: ["parent", "fieldKey"],
  },
  fields: [{
    key: "field",
    type: "ConnectionField",
    required: true,
    entryType: "fieldMeta",
    filterBy: {
      settingsMeta: "settingsMeta",
    },
  }, {
    key: "fieldKey",
    type: "DataField",
    readOnly: true,
    fetchField: {
      connectionField: "field",
      fetchField: "key",
    },
  }, {
    key: "canView",
    type: "BooleanField",
  }, {
    key: "canModify",
    type: "BooleanField",
  }],
});
const actionPermission = defineChildEntry("actionPermissions", {
  label: "Action Permissions",
  idMode: {
    type: "fields",
    fields: ["parent", "actionKey"],
  },
  fields: [{
    key: "action",
    type: "ConnectionField",
    required: true,
    entryType: "actionMeta",
    filterBy: {
      settingsMeta: "settingsMeta",
    },
  }, {
    key: "actionKey",
    type: "DataField",
    readOnly: true,
    fetchField: {
      connectionField: "action",
      fetchField: "key",
    },
  }, {
    key: "canExecute",
    type: "BooleanField",
  }],
});

// const syncRoleConfig: EntryHookDefinition<"settingsPermission"> = {
//   name: "syncRoleConfig",
//   async handler({ settingsPermission, orm }) {
//     const userRole = await orm.getEntry(
//       "userRole",
//       settingsPermission.$userRole,
//     );
//     userRole.runAction("generateConfig");
//   },
// };
export const settingsPermission = defineEntry(
  "settingsPermission",
  {
    systemGlobal: true,
    skipAuditLog: true,
    description: "Role permissions for a specific settings type",
    idMode: {
      type: "fields",
      fields: ["userRole", "settingsMeta"],
    },
    defaultListFields: [
      "userRole",
      "settingsMeta",
      "canView",
      "canModify",
    ],
    fields: [
      {
        key: "userRole",
        type: "ConnectionField",
        entryType: "userRole",
        required: true,
        description: "The user role this permission applies to",
      },
      {
        key: "settingsMeta",
        label: "Settings",
        type: "ConnectionField",
        entryType: "settingsMeta",
        required: true,
        description: "The settings type this permission applies to",
      },
      { key: "canView", type: "BooleanField", defaultValue: true },
      { key: "canModify", type: "BooleanField", defaultValue: false },
      { key: "allowAllActions", type: "BooleanField", defaultValue: true },
    ],
    children: [fieldPermission, actionPermission],
    hooks: {
      validate: [{
        name: "uniqueRoleSettingType",
        description: "Ensure unique role and settings type combination",
        async handler({ settingsPermission, orm }) {
          if (
            !settingsPermission.$userRole || !settingsPermission.$settingsMeta
          ) return;
          settingsPermission;
          const existingId = await orm.findEntryId(
            "settingsPermission",
            {
              userRole: settingsPermission.$userRole,
              settingsMeta: settingsPermission.$settingsMeta,
            },
          );
          if (existingId && existingId !== settingsPermission.id) {
            raiseORMException(
              `An entry permission for role '${settingsPermission.$userRole}' and entry type '${settingsPermission.$settingsMeta}' already exists.`,
            );
          }
        },
      }, {
        name: "ensureUniqeFieldMeta",
        handler({ settingsPermission }) {
          const fields = settingsPermission.$fieldPermissions.data.map((fp) =>
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
        handler({ settingsPermission }) {
          const actions = settingsPermission.$actionPermissions.data.map((ap) =>
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
        async handler({ settingsPermission, orm }) {
          const { rows: actions } = await orm.getEntryList("actionMeta", {
            filter: {
              settingsMeta: settingsPermission.$settingsMeta,
            },
            columns: ["id", "key"],
            limit: 0,
          });
          if (settingsPermission.$allowAllActions) {
            settingsPermission.$actionPermissions.update(actions.map((a) => ({
              action: a.id,
              actionKey: a.key,
              canExecute: true,
            })));
            return;
          }
          const currentActions = settingsPermission.$actionPermissions.data.map(
            (ap) => ap.action,
          );
          const newActions = actions.filter((a) =>
            !currentActions.includes(a.id)
          );
          if (newActions.length > 0) {
            settingsPermission.$actionPermissions.update([
              ...newActions.map((a) => ({
                action: a.id,
                canExecute: false,
              })),
              ...settingsPermission.$actionPermissions.data,
            ]);
          }
        },
      }],
      // afterUpdate: [syncRoleConfig],
      // afterDelete: [syncRoleConfig],
      // afterCreate: [syncRoleConfig],
    },
  },
);
