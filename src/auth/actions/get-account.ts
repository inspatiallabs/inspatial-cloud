import { CloudAPIAction } from "../../api/cloud-action.ts";
import type { SessionData } from "../types.ts";

export const getAccount = new CloudAPIAction("getAccount", {
  description: "Gets the account for the current authenticated user",
  async run({ inRequest, inCloud }) {
    const user = inRequest.context.get<SessionData>("user");
    if (!user || !user.accountId) {
      return;
    }
    const orm = inCloud.orm.withAccount(user.accountId);
    const account = await orm.getEntry("account", user.accountId);

    if (!account.$onboardingComplete) {
      // const steps = await orm.systemDb.getRows("")
    }
    return account.clientData;
  },
  params: [],
});
