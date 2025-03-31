import { CloudAction } from "#/cloud-action.ts";
import { raiseServerException } from "@inspatial/serve";
import { createUserSession } from "#extension/auth/session/create-session.ts";
import type { User } from "#extension/auth/entry-types/generated-types/user.ts";

const login = new CloudAction("login", {
  label: "Login",
  description: "Login to the system",
  async run({ app, inRequest, inResponse, params }) {
    const { email, password } = params;
    const { orm } = app;
    const user = await orm.findEntry<User>("user", {
      email,
    });
    if (!user) {
      raiseServerException(401, "unauthorized");
    }
    const isValid = await user.runAction<boolean>("validatePassword", {
      password,
    });
    if (!isValid) {
      raiseServerException(401, "unauthorized");
    }
    return await createUserSession(app, user, inRequest, inResponse);
  },
  params: [{
    key: "email",
    type: "string",
    label: "Email",
    description: "The email of the user",
    required: true,
  }, {
    key: "password",
    type: "string",
    label: "Password",
    description: "The password of the user",
    required: true,
  }],
});

export default login;
