import { CloudAPIAction } from "../../api/cloud-action.ts";
import type { SessionData } from "../types.ts";

export const updateAccount = new CloudAPIAction("updateAccount", {
  description: "Updates the account data for the current authenticated user",
  async run({ inRequest, params, inCloud }) {
    const user = inRequest.context.get<SessionData>("user");
    if (!user || !user.accountId) {
      return;
    }
    const { accountData } = params;
    const orm = inCloud.orm.withAccount(user.accountId);
    const account = await orm.getEntry("account", user.accountId);

    for (const [key, value] of Object.entries(accountData)) {
      switch (key) {
        case "onboardingComplete":
          account.$onboardingComplete = value as boolean;
          break;
        default:
          account.update({
            [key]: value,
          });
      }
    }
    await account.save();
  },
  params: [{
    key: "accountData",
    type: "JSONField",
    required: true,
    description: "The account data to update",
  }],
});
