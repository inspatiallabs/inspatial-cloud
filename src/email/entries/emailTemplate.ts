import { EntryType } from "@inspatial/cloud";

export const emailTemplate = new EntryType("emailTemplate", {
  systemGlobal: true,
  titleField: "title",
  fields: [
    { key: "title", type: "DataField", required: true, defaultValue: "" },
    { key: "subject", type: "DataField", defaultValue: "" },
    { key: "content", type: "RichTextField" },
    { key: "useGlobalHeader", type: "BooleanField", defaultValue: true },
    { key: "useGlobalFooter", type: "BooleanField", defaultValue: true },
  ],
});

emailTemplate.addAction("renderTemplate", {
  label: "Render Template",
  description: "Render email template with parameters",
  async action({ emailTemplate, params: { params }, orm }) {
    const {
      $enableGlobalHeader,
      $enableGlobalFooter,
      $emailHeaderContent,
      $emailBodyTemplate,
      $emailFooterContent,
    } = await orm.getSettings("emailSettings");
    let content = emailTemplate.$content || "";
    let subject = emailTemplate.$subject || "";
    for (const [key, value] of Object.entries(params)) {
      const regex = new RegExp(`\\{\\s*${key}\\s*\\}`, "g");
      content = content.replace(regex, `${value}` || "");
      subject = subject.replace(regex, `${value}` || "");
    }
    const headerContent = $enableGlobalHeader ? $emailHeaderContent || "" : "";

    const footerContent = $enableGlobalFooter ? $emailFooterContent || "" : "";
    content =
      ($emailBodyTemplate || '<tr><td align="center">{content}</td></tr>')
        .replace(/\{\s*content\s*\}/, content);
    const output = htmlDoc({
      body: content,
      header: headerContent,
      footer: footerContent,
    });
    return { content: output, subject };
  },
  params: [{ key: "params", type: "JSONField", required: true }],
});

function htmlDoc(content: { body: string; header: string; footer: string }) {
  return `
  <!DOCTYPE html>
<html lang="en">
<head></head>
<body>
<table border="0" cellpadding="0" cellspacing="0" width="100%">
<tr>
<td align="center" valign="top">
<table width="100%" style="max-width: 600px">
${header(content.header)}
${emailBody(content.body)}
${footer(content.footer)}

  </table>
   <td>
 </tr>
 </table>
 </body>
 </html>
  `;
}

function emailBody(content: string) {
  return `<tr><td align="center">
  ${content}
</td></tr>`;
}

function footer(content: string) {
  return `<tr>
  <td align="center">
${content}
  </td></tr>`;
}

function header(content: string) {
  return `<tr>
<td align="center">
${content}
</td>
</tr>`;
}
