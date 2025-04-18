import type { User } from "#extensions/auth/entry-types/generated-types/user.ts";
import type { AuthHandler } from "#extensions/auth/auth-handler.ts";
import { CloudAction } from "#/app/cloud-action.ts";
import { raiseServerException } from "#/app/server-exception.ts";

const login = new CloudAction("login", {
  label: "Login",
  description: "Login to the system",
  authRequired: false,
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
    const authHandler = app.getCustomProperty<AuthHandler>("auth");
    return await authHandler.createUserSession(user, inRequest, inResponse);
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
