import { CloudAPIAction } from "~/api/cloud-action.ts";
import { raiseCloudException } from "~/serve/exeption/cloud-exception.ts";

export const registerAccount = new CloudAPIAction("registerAccount", {
  label: "Register Account",
  description: "Create a new acount and assign the given user as the owner.",
  authRequired: false,
  async run({ inCloud, orm, params, inRequest, inResponse }) {
    const { $enableSignup } = await orm.getSettings(
      "systemSettings",
    );
    if (!$enableSignup) {
      raiseCloudException("User signup is disabled", {
        type: "warning",
      });
    }
    const { firstName, lastName, email, password } = params;
    const existingUser = await orm.findEntry("user", [{
      field: "email",
      op: "=",
      value: email,
    }]);
    if (existingUser) {
      raiseCloudException("User already exists", {
        type: "warning",
      });
    }
    const user = orm.getNewEntry("user");
    user.update({
      firstName,
      lastName,
      email,
    });
    await user.save();
    await user.runAction("setPassword", { password });
    const account = await orm.createEntry("account", {
      name: `${firstName} ${lastName}'s Account`,
      users: [{ user: user.$id, isOwner: true }],
    });
    await account.enqueueAction("initialize");
    return await inCloud.auth.createUserSession(user, inRequest, inResponse);
  },
  params: [{
    key: "firstName",
    label: "First Name",
    description: "First name of the user",
    type: "DataField",
    required: true,
  }, {
    key: "lastName",
    label: "Last Name",
    description: "Last name of the user",
    type: "DataField",
    required: true,
  }, {
    key: "email",
    label: "Email",
    description: "Email of the user",
    type: "EmailField",
    required: true,
  }, {
    key: "password",
    label: "Password",
    description: "Password of the user",
    type: "PasswordField",
    required: true,
  }],
});
