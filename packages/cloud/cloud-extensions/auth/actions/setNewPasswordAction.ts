import { createAction } from "#/actions/createAction.ts";
import { raiseEasyException } from "#/easyException.ts";

export const setNewPasswordAction = createAction("setNewPassword", {
  description: "Reset user password",
  public: true,
  async action(app, { token, password }, request, response) {
    const user = await app.orm.findEntry("user", {
      resetPasswordToken: token,
    });
    if (!user) {
      raiseEasyException("Invalid token", 400);
    }
    await user.runAction("setPassword", { password });
    return {
      status: "success",
    };
  },
  params: {
    token: {
      type: "PasswordField",
      required: true,
    },
    password: {
      type: "PasswordField",
      required: true,
    },
  },
});
