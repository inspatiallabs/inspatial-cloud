import { ChildEntryType, EntryType } from "@inspatial/cloud";
import type { Account } from "./_account.type.ts";
import { inLog } from "#inLog";

export const account = new EntryType<Account>("account", {
  label: "Account",
  systemGlobal: true,
  description: "An account in the system with one or more associated users",
  fields: [{
    key: "onboardingComplete",
    type: "BooleanField",
    readOnly: false,
  }, {
    key: "initialized",
    type: "BooleanField",
    readOnly: false,
  }, {
    key: "obResponse",
    label: "Onboarding Response",
    type: "JSONField",
  }],
  children: [
    new ChildEntryType("users", {
      label: "Users",
      fields: [{
        key: "user",
        label: "User",
        type: "ConnectionField",
        entryType: "user",
        required: true,
      }, {
        key: "role",
        label: "Role",
        type: "ChoicesField",
        defaultValue: "accountOwner",
        choices: [],
      }],
      description: "Users associated with this account",
    }),
  ],
  hooks: {
    afterCreate: [{
      name: "createSchema",
      async handler({ account }) {
        await account.enqueueAction("initialize");
      },
    }],
  },
});

account.addAction({
  key: "initialize",
  label: "Initialize Account",
  private: false,
  async action({ account, inCloud }) {
    if (account.initialized) return;
    const schemaId = account.id;
    await inCloud.orm.db.createSchema(schemaId);
    await inCloud.orm.migrate(schemaId);
    // await account.load(account.id);
    account.initialized = true;
    await account.save();
  },
  params: [],
});
