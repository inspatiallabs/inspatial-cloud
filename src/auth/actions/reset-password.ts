import { defineAPIAction } from "~/api/cloud-action.ts";

export const resetPassword = defineAPIAction("resetPassword", {
  description: "Reset user password",
  authRequired: false,
  label: "Reset Password",
  async action({ inCloud, orm, inRequest, params }) {
    const { email, resetUrl } = params;
    const user = await orm.findEntry("user", [{
      field: "email",
      op: "=",
      value: email,
    }]);
    if (!user) {
      return {
        status: 404,
        type: "error",
        title: "User not found",
        error: true,
        message: `Oops! It seems like there is no user with the email ${email}`,
      };
    }
    await user.runAction("generateResetToken");
    const token = user.$resetPasswordToken as string;
    const resetLink = resetUrl || `${inRequest.origin}/reset-password`;
    const searchParams = new URLSearchParams();
    searchParams.set("token", token);
    searchParams.set("email", email);
    const resetString = `${resetLink}?${searchParams.toString()}`;
    const resetPasswordTemplate = await inCloud.orm.asAdmin()
      .getSettingsValue(
        "emailSettings",
        "resetPasswordTemplate",
      );
    try {
      if (resetPasswordTemplate) {
        await inCloud.emailManager.sendTemplateEmail({
          templateId: resetPasswordTemplate,
          recipientEmail: email,
          link: {
            entryType: "user",
            entryId: user.id,
            entryTitle: user.$fullName || user.id,
          },
          params: { resetLink: resetString, firstName: user.$firstName },
        });
      } else {
        const emailContent = `
        <p>Hi ${user.$firstName},</p>
        <p>We received a request to reset your password.</p>
        <p><b>Click the link below to reset your password:<b></p>
        <a href="${resetString}" target="_blank">${resetString}</a>
        <p>If you didn't request a password reset, you can ignore this email.</p>
        <p>Thanks!</p>
        <p>${inCloud.appDisplayName}</p>
        `;
        await inCloud.emailManager.sendEmail({
          recipientEmail: email,
          subject: "Reset your password",
          body: emailContent,
        });
      }

      return {
        status: 200,
        type: "success",
        title: "Password reset email sent",
        error: false,
        message: "Password reset link has been sent to your email",
      };
    } catch (_e) {
      inCloud.inLog.error(_e, "Failed to send reset password email");
      return {
        status: 500,
        type: "error",
        title: "Failed to send reset password email",
        error: true,
        message:
          "There was an error sending the reset password email. Please try again later.",
      };
    }
  },
  params: [
    {
      key: "email",
      label: "Email",
      description: "Email of the user to reset password",
      type: "EmailField",
      required: true,
    },
    {
      key: "resetUrl",
      label: "Reset URL",
      description: "URL to redirect user to reset password",
      type: "URLField",
      required: false,
    },
  ],
});
