import { CloudAPIGroup } from "~/api/cloud-group.ts";
import { resetPassword } from "./actions/reset-password.ts";
import { setNewPassword } from "./actions/set-new-password.ts";
import login from "./actions/login.ts";
import logout from "./actions/logout.ts";
import authCheck from "./actions/auth-check.ts";
import registerUser from "./actions/register-user.ts";
import signInWithGoogle from "./actions/google/login-google.ts";
import googleAuthCallback from "./actions/google/google-auth-callback.ts";
import googleTokenLogin from "./actions/google/google-token-login.ts";

const authGroup = new CloudAPIGroup("auth", {
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
