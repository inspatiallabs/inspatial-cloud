import type { EntryActionDefinition } from "~/orm/entry/types.ts";
import { raiseORMException } from "~/orm/orm-exception.ts";

export const sendVerifyEmail: EntryActionDefinition<"user"> = {
  key: "sendVerifyEmail",
  description: "Sends the user a verification email",
  async action({ inCloud, user, orm }) {
    const templateId = await inCloud.orm.asAdmin().getSettingsValue(
      "emailSettings",
      "verifyTemplate",
    );
    if (!user.$verifyToken) {
      await user.save();
    }
    const token = btoa(`${user.id}:${user.$verifyToken}`);
    const host = await inCloud.getServerHost();
    const url = new URL(`${host}/api`);
    url.searchParams.set("group", "auth");
    url.searchParams.set("action", "verifyUserEmail");
    url.searchParams.set("token", token);
    const link = url.toString();
    if (!templateId) {
      inCloud.emailManager.sendEmail({
        recipientEmail: user.$email,
        subject: `Verify your account with ${inCloud.appDisplayName}`,
        body: `Hi Please verify ${link}`,
      });
      return;
    }
    await inCloud.emailManager.sendTemplateEmail({
      recipientEmail: user.$email,
      templateId,
      params: { link },
      link: {
        entryType: "user",
        entryId: user.id,
      },
    });
    return { success: true };
  },
  params: [],
};
