import { defineAPIAction } from "../../api/cloud-action.ts";
import { raiseServerException } from "../../serve/server-exception.ts";
import type { SessionData } from "../types.ts";

export const switchAccount = defineAPIAction("switchAccount", {
  label: "Switch Logged-in Account",
  description:
    "Switch the current logged-in account to another account that the user has access to",
  params: [{
    key: "accountId",
    label: "Account ID",
    type: "DataField",
    description: "The ID of the account to switch to",
    required: true,
  }],
  async action({
    inCloud,
    inRequest,
    params,
  }) {
    const { accountId } = params;
    const user = inRequest.context.get<SessionData>("user");
    if (!user) {
      raiseServerException(401, "unauthorized");
    }
    const foundId = user.accounts.find((acc) => acc.accountId === accountId);
    if (!foundId) {
      raiseServerException(403, "forbidden");
    }
    user.accountId = accountId;
    const orm = inCloud.orm.withUser(inCloud.orm.systemGobalUser);
    const sessionEntry = await orm.findEntry("userSession", {
      sessionId: user.sessionId,
    });
    if (!sessionEntry) {
      raiseServerException(401, "unauthorized");
    }
    sessionEntry.update({
      sessionData: user,
    });
    await sessionEntry.save();
    inRequest.context.update("user", user);
    inCloud.inCache.setValue("userSession", user.sessionId, user);
    return user;
  },
});
