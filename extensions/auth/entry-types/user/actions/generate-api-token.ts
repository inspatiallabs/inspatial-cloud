import { generateSalt } from "#extensions/auth/security.ts";
import type { EntryActionDefinition } from "~/orm/entry/types.ts";
import type { User } from "../user.type.ts";

const generateApiToken: EntryActionDefinition<User> = {
  key: "generateApiToken",
  label: "Generate API Token",
  description: "Generate an API token for the user",
  async action({ user }): Promise<{ token: string }> {
    const token = generateSalt();
    user.apiToken = token;

    await user.save();
    return { token };
  },
  params: [],
};

export default generateApiToken;
