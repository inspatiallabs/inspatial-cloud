import type { InCloud } from "@inspatial/cloud/types";
import type { Email } from "./entries/_email.type.ts";

export class EmailManager {
  constructor(private inCloud: InCloud) {
  }

  async sendEmail({
    recipientEmail,
    subject,
    body,
    now,
  }: {
    recipientEmail: string;
    subject: string;
    body: string;
    now?: boolean;
  }) {
    const orm = this.inCloud.orm;
    const email = await orm.createEntry<Email>("email", {
      senderName: this.inCloud.appName,
      recipientEmail,
      subject,
      body,
    });
    if (now) {
      return await email.runAction("send");
    }
    return await email.runAction("enqueueSend");
  }
}
