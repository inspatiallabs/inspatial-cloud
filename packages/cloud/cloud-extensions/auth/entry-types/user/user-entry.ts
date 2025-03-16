import { EntryType } from "#orm";
import { User } from "#extension/auth/entry-types/generated-types/user.ts";
import fields from "#extension/auth/entry-types/user/fields.ts";

const userEntry = new EntryType<User>("user", {
  idMode: "ulid",
  titleField: "fullName",
  label: "User",
  defaultListFields: ["firstName", "lastName"],
  description: "A user of the system",
  fields: fields,
  actions: [
    {
      key: "login",
      async action({ user, orm, data }) {
        data.email;
        data.password;
        data.number;
        return {
          ...data,
        };
      },

      params: [{
        key: "email",
        type: "string",
        label: "Password",
        required: true,
      }, {
        key: "password",
        type: "string",
        description: "The user's password used for login",
        required: false,
      }],
    },
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
