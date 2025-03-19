import { createAction } from "#/actions/createAction.ts";
import { raiseEasyException } from "#/easyException.ts";

export const resetPasswordAction = createAction("resetPassword", {
  description: "Reset user password",
  public: true,
  async action(app, { email }, request, response) {
    const user = await app.orm.findEntry("user", {
      email: email,
    });
    if (!user) {
      raiseEasyException(
        `Oops! It seems like there is no user with the email ${email}`,
        404,
      );
    }
    await user.runAction("generateResetToken");
    const token = user.resetPasswordToken as string;
    const resetLink =
      `${request.origin}${app.config.pathPrefix}/reset-password?token=${token}`;

    const emailContent = `
      <p>Hi ${user.firstName},</p>
      <p>We received a request to reset your password.</p>
      <p><b>Click the link below to reset your password:<b></p>
      <a href="${resetLink}" target="_blank">${resetLink}</a>
      <p>If you didn't request a password reset, you can ignore this email.</p>
      <p>Thanks!</p>
      <p>${app.config.appName}</p>    
      `;
    try {
      await app.runAction("email", "sendEmail", {
        data: {
          recipientEmail: email,
          recipientName: user.fullName,
          subject: "Reset your password",
          body: emailContent,
        },

        request,
        response,
      });
      return { message: "Password reset link has been sent to your email" };
    } catch (e) {
      raiseEasyException("Failed to send email", 500);
    }
  },
  params: {
    email: {
      type: "EmailField",
      required: true,
    },
  },
});
