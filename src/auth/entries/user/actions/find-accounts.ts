import type { EntryActionDefinition } from "~/orm/entry/types.ts";
import type { User } from "../_user.type.ts";

export const findAccounts: EntryActionDefinition<User> = {
  key: "findAccounts",
  label: "Find Accounts",
  params: [],
  async action({ user, orm }) {
    const result = await orm.systemDb.getRows("childAccountUsers", {
      columns: ["parent"],
      filter: [{
        field: "user",
        op: "=",
        value: user.id,
      }],
    });
    return result.rows.map((row) => row.parent);
  },
};
