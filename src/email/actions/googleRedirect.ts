import { CloudAPIAction } from "~/api/cloud-action.ts";

import { raiseServerException, Redirect } from "~/serve/server-exception.ts";

import type { EmailSettings } from "~/email/settings/_email-settings.type.ts";
import { GoogleOAuth } from "~/auth/providers/google/accessToken.ts";

export const redirectAction = new CloudAPIAction("redirect", {
  description: "Redirect from Google OAuth",

  async run({ inRequest, params, orm }) {
    const emailSettings = await orm.getSettings<EmailSettings>("emailSettings");
    const authSettings = await orm.getSettings("authSettings");

    const { code, state: accountEntryId } = params;
    const googleAuth = new GoogleOAuth({
      clientId: authSettings.googleClientId,
      clientSecret: authSettings.googleClientSecret,
    });
    const tokenResult = await googleAuth.getAccessToken({
      code,
      redirectUri: `${
        authSettings.hostname || inRequest.fullHost
      }/api?group=email&action=redirect`,
    });
    if (!tokenResult || !tokenResult.accessToken) {
      raiseServerException(
        400,
        "Google auth: Failed to get access token",
      );
    }
    const emailAccount = await orm.getEntry("emailAccount", accountEntryId);
    emailAccount.accessToken = tokenResult?.accessToken;
    emailAccount.acquiredTime = new Date().getTime();
    emailAccount.expireTime = emailAccount.acquiredTime +
      tokenResult.expiresIn * 1000;
    emailAccount.tokenType = tokenResult.tokenType;
    emailAccount.refreshToken = tokenResult.refreshToken;
    emailAccount.scope = tokenResult.scope;
    emailAccount.authStatus = "authorized";
    await emailAccount.save();
    const redirectFinal = emailSettings.redirectFinal ||
      `${inRequest.origin}/#/entry/emailAccount/${emailAccount.id}`;
    return new Redirect(redirectFinal);
  },
  params: [
    {
      key: "code",
      label: "Code",
      type: "TextField",
      required: true,
    },
    {
      key: "scope",
      label: "Scope",
      type: "TextField",
      required: true,
    },
    {
      key: "state",
      label: "State",
      type: "DataField",
      required: true,
    },
  ],
});
