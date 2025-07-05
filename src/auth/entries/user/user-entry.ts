import { EntryType } from "~/orm/entry/entry-type.ts";
import type { User } from "./user.type.ts";
import { findAccounts } from "./actions/find-accounts.ts";
import { userFields } from "./fields/fields.ts";
import { googleFields } from "./fields/google-fields.ts";
import { setPassword } from "./actions/set-password.ts";
import { validatePassword } from "./actions/validate-password.ts";
import { generateApiToken } from "./actions/generate-api-token.ts";
import { generateResetToken } from "./actions/generate-reset-token.ts";

export const userEntry = new EntryType<User>("user", {
  titleField: "fullName",
  systemGlobal: true,
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
    findAccounts,
  ],

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
        await orm.systemDb.deleteRows("entryUserSession", [{
          field: "user",
          op: "=",
          value: user.id,
        }]);
      },
    }],
  },
});
