import { CloudActionGroup } from "#/cloud-action.ts";
import login from "#extension/auth/actions/login.ts";
import logout from "#extension/auth/actions/logout.ts";
import authCheck from "#extension/auth/actions/auth-check.ts";
import resetPassword from "#extension/auth/actions/reset-password.ts";
import setNewPassword from "#extension/auth/actions/set-new-password.ts";
import registerUser from "#extension/auth/actions/register-user.ts";

const authGroup = new CloudActionGroup("auth", {
  description: "Authentication actions",
  label: "Authentication",
  actions: [
    login,
    logout,
    authCheck,
    resetPassword,
    setNewPassword,
    registerUser,
  ],
});

export default authGroup;
