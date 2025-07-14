import { CloudAPIAction } from "@inspatial/cloud";
import type { SessionData } from "../types.ts";
import type { Account } from "../entries/account/_account.type.ts";

export const getAccount = new CloudAPIAction("getAccount", {
  description: "Gets the account for the current authenticated user",
  async run({ inRequest, inCloud }) {
    const user = inRequest.context.get<SessionData>("user");
    if (!user || !user.accountId) {
      return;
    }
    const orm = inCloud.orm.withAccount(user.accountId);
    const account = await orm.getEntry<Account>("account", user.accountId);

    if (!account.onboardingComplete) {
      // const steps = await orm.systemDb.getRows("")
    }
    return account.data;
  },
  params: [],
});
