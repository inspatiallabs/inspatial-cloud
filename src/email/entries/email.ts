import { dateUtils } from "~/utils/date-utils.ts";
import { EntryType } from "~/orm/entry/entry-type.ts";
import { raiseServerException } from "~/serve/server-exception.ts";
import type { SMTPOptions } from "../smtp/smtpTypes.ts";
import { SMTPClient } from "../smtp/smtpClient.ts";

import type { EmailSettings } from "~/email/settings/_email-settings.type.ts";
import type { Email } from "./_email.type.ts";

export const emailEntry = new EntryType<Email>("email", {
  label: "Email",
  description: "An email",
  systemGlobal: true,
  fieldGroups: [],
  defaultListFields: [
    "emailAccount",
    "status",
    "recipientEmail",
    "subject",
    "contentType",
    "sendDate",
  ],
  fields: [{
    key: "emailAccount",
    type: "ConnectionField",
    entryType: "emailAccount",
    label: "From",
    required: false,
  }, {
    key: "senderName",
    type: "DataField",
    label: "Sender's Name",
    description: "The name of the sender",
    readOnly: true,
  }, {
    key: "recipientEmail",
    type: "EmailField",
    label: "To",
    description: "The email address of the recipient",
    required: true,
  }, {
    key: "subject",
    type: "TextField",
    label: "Subject",
    description: "The subject of the email",
  }, {
    key: "contentType",
    type: "ChoicesField",
    label: "Content Type",
    description: "The content type of the email",
    defaultValue: "html",
    choices: [
      { key: "html", label: "HTML", color: "success" },
      { key: "text", label: "Text", color: "warning" },
    ],
  }, {
    key: "sendDate",
    type: "TimeStampField",
    label: "Send Date",
    description: "The date the email was sent",
    readOnly: true,
  }, {
    key: "body",
    type: "TextField",
    label: "Body",
    description: "The body of the email",
  }, {
    key: "htmlBody",
    type: "RichTextField",
    label: "HTML Body",
    description: "The HTML body of the email",
    readOnly: true,
  }, {
    key: "linkAccount",
    type: "ConnectionField",
    entryType: "account",
  }, {
    key: "linkEntry",
    type: "DataField",
    label: "Link Entry",
  }, {
    key: "linkId",
    type: "DataField",
    label: "Link Id",
  }, {
    key: "linkTitle",
    type: "TextField",
    label: "Link Title",
    description: "The title of the linked entry",
  }, {
    key: "status",
    type: "ChoicesField",
    label: "Status",
    description: "The status of the email",
    defaultValue: "pending",
    readOnly: false,
    choices: [
      { key: "pending", label: "Pending", color: "warning" },
      { key: "queued", label: "Queued", color: "info" },
      { key: "sent", label: "Sent", color: "success" },
      { key: "failed", label: "Failed", color: "error" },
    ],
  }],
  hooks: {
    beforeUpdate: [{
      name: "setDefaultAccount",
      description: "Set the default email account if not provided",
      async handler({ orm, email }) {
        if (!email.emailAccount) {
          const emailSettings = await orm.getSettings<EmailSettings>(
            "emailSettings",
          );

          const accountId = emailSettings.defaultSendAccount;
          if (!accountId) {
            raiseServerException(
              400,
              "No default email account is set. Please set a default email account in the settings.",
            );
          }
          email.emailAccount = accountId;
        }
        if (email.contentType === "html") {
          email.htmlBody = email.body;
        }
      },
    }],
    afterUpdate: [{
      name: "notifyAccount",
      handler({ email, inCloud }) {
        if (email.linkAccount) {
          inCloud.inLive.notify({
            accountId: email.linkAccount,
            roomName: "linkedEmail",
            event: "emailStatus",
            data: email.data,
          });
          if (email.linkEntry && email.linkId) {
            const id = email.linkId!;
            const entry = email.linkEntry!;
            inCloud.inLive.notify({
              accountId: email.linkAccount,
              roomName: `linkedEmail:${entry}:${id}`,
              event: "emailStatus",
              data: email.data,
            });
          }
        }
      },
    }],
  },
});
const _attachementFields = [{
  key: "hasAttachment",
  type: "BooleanField",
  label: "Has Attachment",
  description: "Whether the email has an attachment",
  required: false,
  hidden: true,
}, {
  key: "attachmentFileName",
  type: "TextField",
  label: "File Name",
  description: "The name of the file",
  required: false,
  hidden: true,
  dependsOn: "hasAttachment",
}, {
  key: "attachmentContent",
  type: "TextField",
  label: "Content",
  description: "The content of the file",
  required: false,
  hidden: true,
  dependsOn: "hasAttachment",
}, {
  key: "attachmentsContentType",
  type: "ChoicesField",
  label: "Content Type",
  description: "The content type of the file",
  dependsOn: "hasAttachment",
  required: false,
  hidden: true,
  choices: [{
    key: "text",
    label: "Text",
  }, {
    key: "csv",
    label: "CSV",
  }, {
    key: "pdf",
    label: "PDF",
  }],
}];
emailEntry.addAction({
  key: "enqueueSend",
  label: "Send Email",
  params: [],
  async action({ email }) {
    switch (email.status) {
      case "sent":
        raiseServerException(
          400,
          "Email has already been sent.",
        );
        break;
      case "queued":
        raiseServerException(
          400,
          "Email is already queued for sending.",
        );
        break;
      case "pending":
      case "failed":
        break;
    }
    email.status = "queued";
    await email.save();
    await email.enqueueAction("send");
    return {
      message: "Email has been queued for sending.",
      type: "success",
    };
  },
});
emailEntry.addAction({
  key: "send",
  params: [],
  private: false,
  description: "Send the email",
  label: "Send",
  async action({ email, orm }) {
    if (email.status !== "queued") {
      email.status = "queued";
      // raiseEasyException("Email has already been sent", 400);
      await email.save();
    }
    const emailAccount = await orm.getEntry(
      "emailAccount",
      email.emailAccount!,
    );

    let password: string = emailAccount.smtpPassword || "";
    if (emailAccount.useGmailOauth) {
      const expireTime = emailAccount.expireTime as number;
      const nowTime = dateUtils.nowTimestamp();

      if (nowTime > expireTime) {
        await emailAccount.runAction("refreshToken");
      }
      const user = emailAccount.smtpUser;
      if (!user) {
        raiseServerException(
          400,
          "SMTP user is missing",
        );
      }
      if (!emailAccount.accessToken) {
        raiseServerException(
          400,
          "Access token is missing",
        );
      }
      password = emailAccount.accessToken as string;
    }
    const settings = await orm.getSettings("emailSettings");

    const config: SMTPOptions = {
      port: settings.smtpPort as number || 587,
      smtpServer: emailAccount.smtpHost as string,
      userLogin: emailAccount.smtpUser as string,
      password,
      authMethod: emailAccount.useGmailOauth ? "XOAUTH2" : "LOGIN",
      domain: "localhost",
    };
    try {
      const body = email.body as string || "";

      const smtpClient = new SMTPClient(config);

      const errors: string[] = [];

      const addError = (message: string) => {
        errors.push(message);
        orm.inLog.error(message);
      };
      smtpClient.onError = (code, message) => {
        addError(`Email Error ${code}: ${message}`);
      };
      smtpClient.onStateChange = (_state, _message) => {
        orm.inLog.debug(`Email State Change: ${_state} - ${_message}`);
      };
      const sendDate = new Date();
      // const attachments = [];
      // if (email.hasAttachment) {
      //   if (
      //     email.attachmentContent && email.attachmentFileName &&
      //     email.attachmentsContentType
      //   ) {
      //     attachments.push({
      //       fileName: email.attachmentFileName,
      //       content: email.attachmentContent,
      //       contentType: email.attachmentsContentType,
      //     });
      //   }
      // }

      await smtpClient.sendEmail({
        body,
        header: {
          from: {
            email: emailAccount.emailAccount as string,
            name: emailAccount.senderName as string,
          },
          to: [email.recipientEmail],
          subject: email.subject as string,
          contentType: email.contentType as "html" | "text",
          date: sendDate,
        },
        // attachments,
      });
      if (errors.length > 0) {
        email.status = "failed";
        await email.save();
        orm.inLog.error(errors.join("\n"));
        return;
      }

      email.sendDate = sendDate.getTime();
      // Send the email
      email.status = "sent";
      await email.save();
    } catch (e) {
      orm.inLog.error(e, "Failed to send email");
      email.status = "failed";
      await email.save();
    }
  },
});
