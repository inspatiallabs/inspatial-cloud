import type { EntryActionDefinition } from "~/orm/entry/types.ts";

export const findAccounts: EntryActionDefinition<"user"> = {
  key: "findAccounts",
  label: "Find Accounts",
  params: [],
  async action({ user, orm }) {
    const result = await orm.systemDb.getRows("childAccountUsers", {
      columns: ["parent", "role"],
      filter: [{
        field: "user",
        op: "=",
        value: user.id,
      }],
    });
    return result.rows.map((row) => {
      return {
        accountId: row.parent,
        role: row.role,
      };
    });
  },
};
