import { CloudActionGroup } from "#/cloud-action.ts";
import loginAction from "#extension/auth/actions/login-action.ts";
import logoutAction from "#extension/auth/actions/logout-action.ts";

const authGroup = new CloudActionGroup("auth", {
  description: "Authentication actions",
  label: "Authentication",
  actions: [loginAction, logoutAction],
});

export default authGroup;
