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
      key: "recipientName",
      label: "Recipient Name",
      type: "DataField",
      required: false,
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
  ],
  async run({ inCloud, inRequest, orm, inResponse, params }) {
    const { body, recipientEmail, subject, recipientName } = params;
    console.log({ params });
    const email = await orm.createEntry("email", {
      senderName: inCloud.appName,
      recipientEmail,
      recipientName,
      subject,
      body,
    });
    await email.runAction("enqueueEmail");
  },
});
