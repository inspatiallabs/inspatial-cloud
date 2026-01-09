import type { EntryActionDefinition } from "~/orm/entry/types.ts";
import { raiseORMException } from "~/orm/orm-exception.ts";

export const sendWelcomeEmail: EntryActionDefinition<"user"> = {
  key: "sendWelcomeEmail",
  description: "Sends the user a welcome email",
  async action({ inCloud, user, orm }) {
    const templateId = await inCloud.orm.asAdmin().getSettingsValue(
      "emailSettings",
      "welcomeTemplate",
    );
    if (!templateId) {
      raiseORMException("No welcome email template is set!", "Send Email", 400);
    }
    await inCloud.emailManager.sendTemplateEmail({
      recipientEmail: user.$email,
      templateId,
      params: user.clientData,
      link: {
        entryType: "user",
        entryId: user.id,
      },
    });
    return { success: true };
  },
  params: [],
};
