import { CloudAPIAction } from "@inspatial/cloud";

export const sendEmail = new CloudAPIAction("sendEmail", {
  label: "Send Email",
  authRequired: true,
  description: "Send an email to a recipient",
  params: [
    {
      key: "recipientEmail",
      type: "EmailField",
      label: "Recipient Email",
      required: true,
    },

    {
      key: "subject",
      label: "Subject",
      type: "TextField",
      required: true,
    },
    {
      key: "body",
      label: "Body",
      type: "TextField",
      required: true,
    },
    {
      key: "now",
      label: "Send Immediately",
      description:
        "Sends the email immediately, instead of adding it to the task queue",
      type: "BooleanField",
    },
  ],
  async run({ inCloud, params }) {
    const { body, recipientEmail, subject, now } = params;
    return await inCloud.emailManager.sendEmail({
      body,
      recipientEmail,
      subject,
      now,
    });
  },
});
