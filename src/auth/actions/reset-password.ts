import { CloudAPIAction } from "~/api/cloud-action.ts";

import { raiseServerException } from "~/app/server-exception.ts";

export const resetPassword = new CloudAPIAction("resetPassword", {
  description: "Reset user password",
  authRequired: false,
  label: "Reset Password",
  async run({ inCloud, orm, inRequest, params }) {
    console.log("Reset password action called with params:", params);
    const { email } = params;
    const user = await orm.findEntry("user", [{
      field: "email",
      op: "=",
      value: email,
    }]);
    if (!user) {
      raiseServerException(
        404,
        `Oops! It seems like there is no user with the email ${email}`,
      );
    }
    await user.runAction("generateResetToken");
    const token = user.resetPasswordToken as string;
    const resetLink = `${inRequest.origin}/#/reset-password?token=${token}`;

    const emailContent = `
      <p>Hi ${user.firstName},</p>
      <p>We received a request to reset your password.</p>
      <p><b>Click the link below to reset your password:<b></p>
      <a href="${resetLink}" target="_blank">${resetLink}</a>
      <p>If you didn't request a password reset, you can ignore this email.</p>
      <p>Thanks!</p>
      <p>${inCloud.appName}</p>
      `;
    try {
      await inCloud.runAction("email", "sendEmail", {
        recipientEmail: email,
        subject: "Reset your password",
        body: emailContent,
      });
      return { message: "Password reset link has been sent to your email" };
    } catch (_e) {
      console.error("Failed to send reset password email:", _e);
      raiseServerException(
        500,
        "Failed to send email",
      );
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
  ],
});
