import type { EntryActionDefinition } from "#orm/types";
import type { User } from "#extension/auth/entry-types/generated-types/user.ts";
import { generateSalt } from "#extension/auth/security.ts";

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
