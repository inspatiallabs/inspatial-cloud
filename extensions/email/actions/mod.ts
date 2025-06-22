import { sendEmail } from "./sendEmail.ts";
import { redirectAction } from "./googleRedirect.ts";
import { CloudAPIGroup } from "/api/cloud-group.ts";

export const emailGroup: CloudAPIGroup<"email"> = new CloudAPIGroup("email", {
  label: "Email",
  description: "Email management",
  actions: [sendEmail, redirectAction],
});
