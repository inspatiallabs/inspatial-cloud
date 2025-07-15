import { CloudAPIAction } from "../../api/cloud-action.ts";
import type { Account } from "../../auth/entries/account/_account.type.ts";
import type { SessionData } from "../../auth/types.ts";
import { raiseCloudException } from "../../serve/exeption/cloud-exception.ts";

export const completeOnboarding = new CloudAPIAction("completeOnboarding", {
  async run({ inRequest, params: { obResponse }, inCloud, orm }) {
    const user = inRequest.context.get<SessionData>("user")!;
    const account = await inCloud.orm.withAccount(user.accountId)
      .getEntry<Account>(
        "account",
        user.accountId,
      );
    if (account.onboardingComplete) {
      raiseCloudException(
        "Onboarding is already complete for this account.",
        {
          scope: "Onboarding",
          type: "warning",
        },
      );
    }
    const { afterOnboarding } = inCloud.extensionManager;

    for (const action of afterOnboarding) {
      await action({
        account,
        inCloud,
        orm,
        responses: obResponse,
      });
    }
    account.onboardingComplete = true;
    account.obResponse = obResponse;
    await account.save();
    return {
      message: "Onboarding completed successfully.",
      accountId: account.id,
    };
  },
  params: [{
    key: "obResponse",
    label: "Onboarding Response",
    type: "JSONField",
    required: true,
  }],
});
