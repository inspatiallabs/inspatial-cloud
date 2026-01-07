import type { EntryActionDefinition } from "~/orm/entry/types.ts";
import { raiseORMException } from "~/orm/orm-exception.ts";

export const sendVerifyEmail: EntryActionDefinition<"user"> = {
  key: "sendVerifyEmail",
  description: "Sends the user a verification email",
  async action({ inCloud, user, orm }) {
    const templateId = await orm.asAdmin().getSettingsValue(
      "emailSettings",
      "verifyTemplate",
    );
    if (!templateId) {
      raiseORMException("No verification template is set!", "Send Email", 400);
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
