import { CloudAPIGroup } from "@inspatial/cloud";
import { sendEmail } from "./sendEmail.ts";

export const emailGroup = new CloudAPIGroup("email", {
  label: "Email",
  description: "Email management",
  actions: [sendEmail],
});
