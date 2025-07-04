import { ChildEntryType, EntryType } from "@inspatial/cloud";
import type { Account } from "./account.type.ts";

export const account = new EntryType<Account>("account", {
  label: "Account",
  systemGlobal: true,
  description: "An account in the system with one or more associated users",
  fields: [{
    key: "initialized",
    label: "Initialized",
    type: "BooleanField",
    readOnly: true,
  }],
  children: [
    new ChildEntryType("users", {
      label: "Users",
      fields: [{
        key: "user",
        label: "User",
        type: "ConnectionField",
        entryType: "user",
      }],
      description: "Users associated with this account",
    }),
  ],
  hooks: {
    afterCreate: [{
      name: "createSchema",
      async handler({ account }) {
        const result = await account.enqueueAction("initialize");
      },
    }],
  },
});

account.addAction({
  key: "initialize",
  label: "Initialize Account",
  async action({ account, orm }) {
    const schemaId = account.id;
    await orm.db.createSchema(schemaId);
    await orm.migrate(schemaId);
  },
  params: [],
});
