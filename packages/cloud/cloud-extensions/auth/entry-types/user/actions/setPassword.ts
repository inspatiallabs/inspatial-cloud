import type { EntryActionDefinition } from "#orm/types";
import type { User } from "#extension/auth/entry-types/generated-types/user.ts";
import { generateSalt, hashPassword } from "#extension/auth/security.ts";

const setPassword: EntryActionDefinition<User> = {
  key: "setPassword",
  description: "Set the user's password",
  async action({ user, data }): Promise<void> {
    const password = data.password as string;
    const salt = generateSalt();
    const hashed = await hashPassword(password, salt);
    user.password = `${salt}:${hashed}`;
    user.resetPasswordToken = undefined;
    await user.save();
  },
  params: [
    {
      key: "password",
      type: "PasswordField",
      label: "Password",
      description: "Password to set",
      required: true,
    },
  ],
};

export default setPassword;
