import type { EntryActionDefinition } from "#orm/types";
import type { User } from "#extension/auth/entry-types/generated-types/user.ts";
import { generateSalt } from "#extension/auth/security.ts";

const generateResetToken: EntryActionDefinition<User> = {
  key: "generateResetToken",
  label: "Generate Reset Token",
  description: "Generate a reset token for the user",
  async action({ user }): Promise<{ token: string }> {
    const token = generateSalt();
    user.resetPasswordToken = token;
    await user.save();
    return { token };
  },
  params: [],
};

export default generateResetToken;
