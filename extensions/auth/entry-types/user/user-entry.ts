import type { User } from "#extensions/auth/entry-types/generated-types/user.ts";
import setPassword from "#extensions/auth/entry-types/user/actions/setPassword.ts";
import validatePassword from "#extensions/auth/entry-types/user/actions/validatePassword.ts";
import generateApiToken from "#extensions/auth/entry-types/user/actions/generate-api-token.ts";
import generateResetToken from "#extensions/auth/entry-types/user/actions/generate-reset-token.ts";
import { userFields } from "#extensions/auth/entry-types/user/fields/fields.ts";
import googleFields from "#extensions/auth/entry-types/user/fields/google-fields.ts";
import { EntryType } from "/orm/entry/entry-type.ts";

const userEntry = new EntryType<User>("user", {
  idMode: "ulid",
  titleField: "fullName",
  label: "User",
  defaultListFields: ["firstName", "lastName", "email", "systemAdmin"],
  description: "A user of the system",
  searchFields: ["email"],

  fields: [
    ...userFields,
    ...googleFields,
  ],
  actions: [
    setPassword,
    validatePassword,
    generateApiToken,
    generateResetToken,
  ],
  roles: [{
    roleName: "basic",
    permission: {
      view: true,
      modify: false,
      create: false,
      delete: false,
      fields: {
        systemAdmin: {
          view: false,
          modify: false,
        },
      },
    },
  }],
  hooks: {
    beforeUpdate: [{
      name: "setFullName",
      description: "Set the full name of the user",
      handler({
        user,
      }) {
        user.fullName = `${user.firstName} ${user.lastName}`;
        if (user.systemAdmin) {
          user.role = "systemAdmin";
        }
      },
    }],
    beforeDelete: [{
      name: "deleteUserSessions",
      description: "Delete all user sessions",
      async handler({ orm, user }) {
        await orm.db.deleteRows("entryUserSession", [{
          field: "user",
          op: "=",
          value: user.id,
        }]);
      },
    }],
  },
});

export default userEntry;
