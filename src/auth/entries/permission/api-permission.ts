import { defineChildEntry } from "../../../orm/child-entry/child-entry.ts";
import { raiseORMException } from "../../../orm/orm-exception.ts";
import type { EntryHookDefinition } from "../../../orm/entry/types.ts";
import { defineEntry } from "../../../orm/entry/entry-type.ts";

const apiActions = defineChildEntry("actions", {
  label: "API Actions",
  idMode: {
    type: "fields",
    fields: ["parent", "apiAction"],
  },
  fields: [{
    key: "apiAction",
    label: "Action",
    type: "ConnectionField",
    entryType: "apiAction",
    required: true,
    filterBy: {
      apiGroup: "apiGroup",
    },
  }, {
    key: "canAccess",
    label: "Can Access",
    type: "BooleanField",
    defaultValue: false,
    description: "Whether the role can access this API action",
  }],
});
const syncRoleConfig: EntryHookDefinition<"apiGroupPermission"> = {
  name: "syncRoleConfig",
  async handler({ apiGroupPermission, orm }) {
    const userRole = await orm.getEntry(
      "userRole",
      apiGroupPermission.$userRole,
    );
    userRole.runAction("generateConfig");
  },
};
export const apiGroupPermission = defineEntry("apiGroupPermission", {
  systemGlobal: true,
  idMode: {
    type: "fields",
    fields: ["userRole", "apiGroup"],
  },
  fields: [{
    key: "userRole",
    type: "ConnectionField",
    entryType: "userRole",
    required: true,
  }, {
    key: "apiGroup",
    type: "ConnectionField",
    entryType: "apiGroup",
    required: true,
  }, {
    key: "canAccess",
    type: "BooleanField",
    defaultValue: true,
    description:
      "Whether the role can access this API group. Turns off all actions if false.",
  }, {
    key: "accessAll",
    type: "BooleanField",
    defaultValue: false,
    description:
      "If enabled, the role will have access to all actions within this group. Individual action permissions will be ignored.",
  }],
  children: [apiActions],
  hooks: {
    validate: [{
      name: "validateUnique",
      handler({ apiGroupPermission }) {
        const actions = apiGroupPermission.$actions.data.map((ap) =>
          ap.apiAction
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
    }, {
      name: "enforceNoChangeRoleGroup",
      handler({ apiGroupPermission }) {
        if (apiGroupPermission.isNew) return;
        if (
          apiGroupPermission.isFieldModified("userRole") ||
          apiGroupPermission.isFieldModified("apiGroup")
        ) {
          raiseORMException("Cannot change userRole or apiGroup once set.");
        }
      },
    }],
    beforeUpdate: [{
      name: "setActions",
      async handler({ apiGroupPermission, orm }) {
        const { rows: actions } = await orm.getEntryList("apiAction", {
          filter: {
            apiGroup: apiGroupPermission.$apiGroup,
          },
          columns: ["id"],
          limit: 0,
        });
        const currentActions = apiGroupPermission.$actions.data.map(
          (ap) => ap.apiAction,
        );

        if (!apiGroupPermission.$canAccess || apiGroupPermission.$accessAll) {
          apiGroupPermission.$accessAll = apiGroupPermission.$canAccess;
          apiGroupPermission.$actions.update(actions.map((a) => ({
            apiAction: a.id,
            canAccess: apiGroupPermission.$accessAll,
          })));
          return;
        }
        const newActions = actions.filter((a) =>
          !currentActions.includes(a.id)
        );
        if (newActions.length > 0) {
          apiGroupPermission.$actions.update([
            ...newActions.map((a) => ({
              apiAction: a.id,
              canAccess: apiGroupPermission.$canAccess,
            })),
            ...apiGroupPermission.$actions.data,
          ]);
        }
      },
    }],
    // afterUpdate: [syncRoleConfig],
    // afterDelete: [syncRoleConfig],
    // afterCreate: [syncRoleConfig],
  },
});
