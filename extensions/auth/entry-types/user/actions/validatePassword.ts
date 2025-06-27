import { hashPassword } from "#extensions/auth/security.ts";
import type { EntryActionDefinition } from "~/orm/entry/types.ts";
import type { User } from "../user.type.ts";

const validatePassword: EntryActionDefinition<User> = {
  key: "validatePassword",
  label: "Validate Password",
  description: "Validate the user's password",
  async action({ data, user }): Promise<boolean> {
    const password = data.password as string;
    const existingPassword = user.password;
    if (!existingPassword) {
      return false;
    }
    const [salt, hashed] = existingPassword.split(":");
    const testHash = await hashPassword(password, salt);
    return hashed === testHash;
  },
  params: [{
    key: "password",
    type: "PasswordField",
    label: "Password",
    description: "Password to validate",
    required: true,
  }],
};

export default validatePassword;
