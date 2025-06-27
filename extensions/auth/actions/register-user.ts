import { CloudAPIAction } from "~/api/cloud-action.ts";

const registerUser = new CloudAPIAction("registerUser", {
  description: "Register a new user",
  hideFromApi: true,
  async run({ inCloud, params }) {
    const { firstName, lastName, email, password } = params;
    const user = await inCloud.orm.createEntry("user", {
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
