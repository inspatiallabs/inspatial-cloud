import login from "#extensions/auth/actions/login.ts";
import logout from "#extensions/auth/actions/logout.ts";
import authCheck from "#extensions/auth/actions/auth-check.ts";
import resetPassword from "#extensions/auth/actions/reset-password.ts";
import setNewPassword from "#extensions/auth/actions/set-new-password.ts";
import registerUser from "#extensions/auth/actions/register-user.ts";
import signInWithGoogle from "#extensions/auth/actions/google/login-google.ts";
import googleAuthCallback from "#extensions/auth/actions/google/google-auth-callback.ts";
import googleTokenLogin from "#extensions/auth/actions/google/google-token-login.ts";
import { CloudActionGroup } from "#/app/cloud-action.ts";

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
    signInWithGoogle,
    googleAuthCallback,
    googleTokenLogin,
  ],
});

export default authGroup;
