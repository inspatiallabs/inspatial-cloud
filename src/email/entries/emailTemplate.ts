import { EntryType } from "@inspatial/cloud";

export const emailTemplate = new EntryType("emailTemplate", {
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

emailTemplate.addAction("renderTemplate", {
  label: "Render Template",
  description: "Render email template with parameters",
  action({ emailTemplate, params }) {
    let content = emailTemplate.$content || "";
    let subject = emailTemplate.$subject || "";
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
