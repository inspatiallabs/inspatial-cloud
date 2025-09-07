import type { EntryActionDefinition } from "~/orm/entry/types.ts";
import { generateSalt } from "../../../security.ts";

export const generateResetToken: EntryActionDefinition<"user"> = {
  key: "generateResetToken",
  label: "Generate Reset Token",
  description: "Generate a reset token for the user",
  async action({ user }): Promise<{ token: string }> {
    const token = generateSalt();
    user.$resetPasswordToken = token;
    await user.save();
    return { token };
  },
  params: [],
};
