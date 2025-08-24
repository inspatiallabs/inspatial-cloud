import type { InCloud } from "@inspatial/cloud/types";
import type { Email } from "./entries/_email.type.ts";
import type { EmailTemplate } from "./entries/_email-template.type.ts";
import { InFilter } from "../orm/db/db-types.ts";
interface SendEmailOptions {
  recipientEmail: string;
  subject: string;
  body: string;
  now?: boolean;
  link?: EmailLink;
}
interface EmailLink {
  account: string;
  entryType: string;
  entryId: string;
  entryTitle?: string;
}
export class EmailManager {
  constructor(private inCloud: InCloud) {
  }
  async getLinkedEmails(args: {
    account: string;
    entryType?: string;
    entryId?: string;
  }) {
    const orm = this.inCloud.orm;

    const filters: InFilter[] = [{
      field: "linkAccount",
      op: "=",
      value: args.account,
    }];
    if (args.entryType) {
      filters.push({
        field: "linkEntry",
        op: "=",
        value: args.entryType,
      });
    }
    if (args.entryId) {
      filters.push({
        field: "linkId",
        op: "=",
        value: args.entryId,
      });
    }

    const emails = await orm.getEntryList<Email>("email", {
      filter: filters,
      columns: [
        "id",
        "recipientEmail",
        "linkEntry",
        "linkId",
        "linkTitle",
        "sendDate",
        "status",
        "subject",
      ],
    });
    return emails;
  }
  async sendTemplateEmail(args: {
    recipientEmail: string;
    templateId: string;
    params: Record<string, any>;
    now?: boolean;
    link: EmailLink;
  }) {
    const { recipientEmail, templateId, params, now, link } = args;
    const orm = this.inCloud.orm;
    const template = await orm.getEntry<EmailTemplate>(
      "emailTemplate",
      templateId,
    );
    const rendered: { content: string; subject: string } = await template
      .runAction("renderTemplate", { params });
    return await this.sendEmail({
      recipientEmail,
      subject: rendered.subject || "",
      body: rendered.content || "",
      now,
      link,
    });
  }
  async sendEmail({
    recipientEmail,
    subject,
    body,
    now,
    link,
  }: SendEmailOptions): Promise<any> {
    const orm = this.inCloud.orm;
    const email = orm.getNewEntry<Email>("email");
    email.recipientEmail = recipientEmail;
    email.subject = subject;
    email.body = body;
    if (link?.account) {
      email.linkAccount = link.account;
      email.linkTitle = link.account;
    }
    if (link?.entryType) {
      email.linkEntry = link.entryType;
      email.linkTitle = link.entryType;
    }
    if (link?.entryId) {
      email.linkId = link.entryId;
      email.linkTitle = link.entryId;
    }
    if (link?.entryTitle) {
      email.linkTitle = link.entryTitle;
    }

    await email.save();
    if (now) {
      return await email.runAction("send");
    }
    return await email.runAction("enqueueSend");
  }
}
