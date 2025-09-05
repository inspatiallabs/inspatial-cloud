import type { EntryActionDefinition } from "~/orm/entry/types.ts";
import type { User } from "../_user.type.ts";
import { generateSalt, hashPassword } from "../../../security.ts";

export const setPassword: EntryActionDefinition<User> = {
  key: "setPassword",
  description: "Set the user's password",
  async action({ user, data }): Promise<void> {
    const password = data.password as string;
    const salt = generateSalt();
    const hashed = await hashPassword(password, salt);
    user.$password = `${salt}:${hashed}`;
    user.$resetPasswordToken = undefined;
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
