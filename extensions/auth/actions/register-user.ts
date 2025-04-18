import { CloudAction } from "#/app/cloud-action.ts";

const registerUser = new CloudAction("registerUser", {
  description: "Register a new user",
  hideFromApi: true,
  async run({ app, params }) {
    const { firstName, lastName, email, password } = params;
    const user = await app.orm.createEntry("user", {
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
    type: "string",
    required: true,
  }, {
    key: "lastName",
    label: "Last Name",
    description: "Last name of the user",
    type: "string",
    required: true,
  }, {
    key: "email",
    label: "Email",
    description: "Email of the user",
    type: "string",
    required: true,
  }, {
    key: "password",
    label: "Password",
    description: "Password of the user",
    type: "string",
    required: true,
  }],
});

export default registerUser;
