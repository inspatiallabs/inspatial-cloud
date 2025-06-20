import { CloudAPIAction } from "#/api/cloud-action.ts";

import { raiseServerException } from "#/app/server-exception.ts";

const resetPassword = new CloudAPIAction("resetPassword", {
  description: "Reset user password",
  authRequired: false,
  async run({ inCloud, inRequest, params }) {
    const { email } = params;
    const user = await inCloud.orm.findEntry("user", [{
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
    const resetLink = `${inRequest.origin}/reset-password?token=${token}`;

    const _emailContent = `
      <p>Hi ${user.firstName},</p>
      <p>We received a request to reset your password.</p>
      <p><b>Click the link below to reset your password:<b></p>
      <a href="${resetLink}" target="_blank">${resetLink}</a>
      <p>If you didn't request a password reset, you can ignore this email.</p>
      <p>Thanks!</p>
      <p>${inCloud.appName}</p>
      `;
    // try {
    //   await app.runAction("email", "sendEmail", {
    //     data: {
    //       recipientEmail: email,
    //       recipientName: user.fullName,
    //       subject: "Reset your password",
    //       body: emailContent,
    //     },

    //     request,
    //     response,
    //   });
    //   return { message: "Password reset link has been sent to your email" };
    // } catch (e) {
    //   raiseEasyException("Failed to send email", 500);
    // }
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

export default resetPassword;
