import { CloudAPIAction } from "~/api/cloud-action.ts";
import { raiseServerException } from "~/app/server-exception.ts";

export const setNewPassword = new CloudAPIAction("setNewPassword", {
  description: "Reset user password",
  authRequired: false,
  async run({ inCloud, params }) {
    const { token, password } = params;
    const user = await inCloud.orm.findEntry("user", [{
      field: "resetPasswordToken",
      op: "=",
      value: token,
    }]);
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
    type: "TextField",
    required: true,
  }, {
    key: "password",
    label: "Password",
    description: "New password to set",
    type: "PasswordField",
    required: true,
  }],
});
