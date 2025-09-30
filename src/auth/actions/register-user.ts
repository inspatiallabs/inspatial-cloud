import { defineAPIAction } from "~/api/cloud-action.ts";
import { raiseCloudException } from "../../serve/exeption/cloud-exception.ts";

const registerUser = defineAPIAction("registerUser", {
  description: "Register a new user",
  hideFromApi: true,
  async action({ orm, params }) {
    const { $enableSignup } = await orm.getSettings(
      "systemSettings",
    );
    if (!$enableSignup) {
      raiseCloudException("User signup is disabled", {
        type: "warning",
      });
    }
    const { firstName, lastName, email, password } = params;
    const user = await orm.createEntry("user", {
      firstName,
      lastName,
      email,
    });
    await user.runAction("setPassword", { password });
    return user.data;
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

export default registerUser;
