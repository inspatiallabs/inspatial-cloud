import type { User } from "#extensions/auth/entry-types/generated-types/user.ts";
import setPassword from "#extensions/auth/entry-types/user/actions/setPassword.ts";
import validatePassword from "#extensions/auth/entry-types/user/actions/validatePassword.ts";
import generateApiToken from "#extensions/auth/entry-types/user/actions/generate-api-token.ts";
import generateResetToken from "#extensions/auth/entry-types/user/actions/generate-reset-token.ts";
import fields from "#extensions/auth/entry-types/user/fields/fields.ts";
import googleFields from "#extensions/auth/entry-types/user/fields/google-fields.ts";
import { EntryType } from "#/orm/entry/entry-type.ts";

const userEntry = new EntryType<User>("user", {
  idMode: "ulid",
  titleField: "fullName",
  label: "User",
  defaultListFields: ["firstName", "lastName", "email", "systemAdmin"],
  description: "A user of the system",
  searchFields: ["email"],

  fields: [
    ...fields,
    ...googleFields,
  ],
  actions: [
    setPassword,
    validatePassword,
    generateApiToken,
    generateResetToken,
  ],
  hooks: {
    beforeUpdate: [{
      name: "setFullName",
      description: "Set the full name of the user",
      handler({
        user,
      }) {
        user.fullName = `${user.firstName} ${user.lastName}`;
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
