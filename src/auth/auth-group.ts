import { defineAPIGroup } from "~/api/cloud-group.ts";
import { resetPassword } from "./actions/reset-password.ts";
import { setNewPassword } from "./actions/set-new-password.ts";
import login from "./actions/login.ts";
import logout from "./actions/logout.ts";
import authCheck from "./actions/auth-check.ts";
import registerUser from "./actions/register-user.ts";
import { signInWithGoogle } from "./actions/google/login-google.ts";
import { signupWithGoogle } from "./actions/google/signup-google.ts";
import googleAuthCallback from "./actions/google/google-auth-callback.ts";
import googleTokenLogin from "./actions/google/google-token-login.ts";

import { getAccount } from "./actions/get-account.ts";
import { updateAccount } from "./actions/update-account.ts";
import { completeOnboarding } from "../onboarding/actions/complete-onboarding.ts";
import { registerAccount } from "./actions/register-account.ts";
import { switchAccount } from "./actions/switch-account.ts";
import { verifyUserEmail } from "./actions/verify-user-email.ts";

const authGroup = defineAPIGroup("auth", {
  description: "User, Account and Authentication related actions",
  label: "Authentication",
  actions: [
    login,
    logout,
    authCheck,
    resetPassword,
    setNewPassword,
    registerUser,
    signInWithGoogle,
    signupWithGoogle,
    googleAuthCallback,
    googleTokenLogin,
    getAccount,
    updateAccount,
    registerAccount,
    completeOnboarding,
    switchAccount,
    verifyUserEmail,
  ],
});

export default authGroup;
