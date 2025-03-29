import { EntryType } from "#orm";
import type { User } from "#extension/auth/entry-types/generated-types/user.ts";
import fields from "#extension/auth/entry-types/user/fields.ts";
import setPassword from "#extension/auth/entry-types/user/actions/setPassword.ts";
import validatePassword from "#extension/auth/entry-types/user/actions/validatePassword.ts";
import generateApiToken from "#extension/auth/entry-types/user/actions/generate-api-token.ts";
import generateResetToken from "#extension/auth/entry-types/user/actions/generate-reset-token.ts";

const userEntry = new EntryType<User>("user", {
  idMode: "ulid",
  titleField: "fullName",
  label: "User",
  defaultListFields: ["firstName", "lastName", "email", "systemAdmin"],
  description: "A user of the system",
  fields: fields,
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
  },
});

export default userEntry;
