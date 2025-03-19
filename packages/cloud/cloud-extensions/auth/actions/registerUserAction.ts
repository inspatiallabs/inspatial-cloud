import { createAction } from "#/actions/createAction.ts";

export const registerUserAction = createAction("registerUser", {
  description: "Register a new user",
  system: true,
  async action(app, { firstName, lastName, email, password }) {
    const user = await app.orm.createEntry("user", {
      firstName,
      lastName,
      email,
    });
    await user.runAction("setPassword", { password });
    return user.data;
  },
  params: {
    firstName: {
      type: "DataField",
      required: true,
    },
    lastName: {
      type: "DataField",
      required: true,
    },
    email: {
      type: "EmailField",
      required: true,
    },
    password: {
      type: "PasswordField",
      required: true,
    },
  },
});
