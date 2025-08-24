import { EntryType } from "@inspatial/cloud";
import type { EmailTemplate } from "./_email-template.type.ts";

export const emailTemplate = new EntryType<EmailTemplate>("emailTemplate", {
  systemGlobal: true,
  titleField: "title",
  fields: [{
    key: "title",
    type: "DataField",
    required: true,
    defaultValue: "",
  }, {
    key: "subject",
    type: "DataField",
    defaultValue: "",
  }, {
    key: "content",
    type: "RichTextField",
  }],
});

emailTemplate.addAction({
  key: "renderTemplate",
  label: "Render Template",
  description: "Render email template with parameters",
  action({ emailTemplate, data }) {
    let content = emailTemplate.content || "";
    let subject = emailTemplate.subject || "";
    const params = data.params as Record<string, any>;
    for (const [key, value] of Object.entries(params)) {
      const regex = new RegExp(`\\{\\s*${key}\\s*\\}`, "g");
      content = content.replace(regex, `${value}` || "");
      subject = subject.replace(regex, `${value}` || "");
    }
    return { content, subject };
  },
  params: [{
    key: "params",
    type: "JSONField",
    required: true,
  }],
});
