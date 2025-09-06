import { sendEmail } from "./sendEmail.ts";
import { redirectAction } from "./googleRedirect.ts";
import { CloudAPIGroup } from "~/api/cloud-group.ts";
import type { SessionData } from "../../auth/types.ts";

export const emailGroup: CloudAPIGroup<"email"> = new CloudAPIGroup("email", {
  label: "Email",
  description: "Email management",
  actions: [sendEmail, redirectAction],
});

emailGroup.addAction("getLinks", {
  params: [{
    key: "entryType",
    type: "DataField",
    label: "Entry Type",
    required: false,
  }, {
    key: "entryId",
    type: "DataField",
    label: "Entry ID",
    required: false,
  }],
  async run({ inRequest, params, inCloud }) {
    const { entryId, entryType } = params;
    const user = inRequest.context.get<SessionData>("user");

    const accountId = user!.accountId;
    const emails = await inCloud.emailManager.getLinkedEmails({
      account: accountId,
      entryType,
      entryId,
    });
    return emails;
  },
});
