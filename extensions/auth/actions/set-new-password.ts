import { CloudAction } from "#/app/cloud-action.ts";
import { raiseServerException } from "#/app/server-exception.ts";

const setNewPassword = new CloudAction("setNewPassword", {
  description: "Reset user password",
  authRequired: false,
  async run({ app, params }) {
    const { token, password } = params;
    const user = await app.orm.findEntry("user", {
      resetPasswordToken: token,
    });
    if (!user) {
      raiseServerException(400, "Invalid token");
    }
    await user.runAction("setPassword", { password });
    return {
      status: "success",
    };
  },
  params: [{
    key: "token",
    label: "Token",
    description: "Token to reset password",
    type: "string",
    required: true,
  }, {
    key: "password",
    label: "Password",
    description: "New password to set",
    type: "string",
    required: true,
  }],
});

export default setNewPassword;
