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
      const content = `<p>Hi ${user.$firstName},<p>
        <p>Thanks for creating an account with ${inCloud.appDisplayName}.</p>
        <p>Before you get started, please verify your email address by clicking the link below:</p>

        <a href="${link}" target="_blank">Verify Email</a>
        <p>If you did not create this account, you can safely ignore this email.</p>
        <p>${inCloud.appDisplayName}</p>
`;
      inCloud.emailManager.sendEmail({
        recipientEmail: user.$email,
        subject: `Verify your email with ${inCloud.appDisplayName}`,
        body: content,
      });
      return { success: true };
    }
    await inCloud.emailManager.sendTemplateEmail({
      recipientEmail: user.$email,
      templateId,
      params: { link, firstName: user.$firstName },
      link: {
        entryType: "user",
        entryId: user.id,
      },
    });
    return { success: true };
  },
  params: [],
};
