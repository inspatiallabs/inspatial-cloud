import { CloudAPIAction } from "~/api/cloud-action.ts";

import { raiseServerException } from "~/serve/server-exception.ts";

import { GoogleOAuth } from "~/auth/providers/google/accessToken.ts";

export const redirectAction = new CloudAPIAction("redirect", {
  description: "Redirect from Google OAuth",

  async run({ inRequest, params, orm, inResponse }) {
    const emailSettings = await orm.getSettings("emailSettings");
    const authSettings = await orm.getSettings("authSettings");
    if (!authSettings.$googleClientId || !authSettings.$googleClientSecret) {
      raiseServerException(
        500,
        "Google auth is not configured. Missing client ID or client secret.",
      );
    }
    const { code, state: accountEntryId } = params;
    const googleAuth = new GoogleOAuth({
      clientId: authSettings.$googleClientId,
      clientSecret: authSettings.$googleClientSecret,
    });
    const tokenResult = await googleAuth.getAccessToken({
      code,
      redirectUri: `${
        authSettings.$hostname || inRequest.fullHost
      }/api?group=email&action=redirect`,
    });
    if (!tokenResult || !tokenResult.accessToken) {
      raiseServerException(
        400,
        "Google auth: Failed to get access token",
      );
    }
    const emailAccount = await orm.getEntry("emailAccount", accountEntryId);
    emailAccount.$accessToken = tokenResult?.accessToken;
    emailAccount.$acquiredTime = new Date().getTime();
    emailAccount.$expireTime = emailAccount.$acquiredTime +
      tokenResult.expiresIn * 1000;
    emailAccount.$tokenType = tokenResult.tokenType;
    emailAccount.$refreshToken = tokenResult.refreshToken;
    emailAccount.$scope = tokenResult.scope;
    emailAccount.$authStatus = "authorized";
    await emailAccount.save();
    const redirectFinal = emailSettings.$redirectFinal ||
      `${inRequest.origin}/#/entry/emailAccount/${emailAccount.id}`;
    return inResponse.redirect(redirectFinal);
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
    {
      key: "authuser",
      label: "Auth User",
      type: "DataField",
      required: false,
      description: "The authuser parameter returned by Google",
    },
    {
      key: "hd",
      label: "HD",
      type: "DataField",
      required: false,
      description: "The hd parameter returned by Google",
    },
    {
      key: "prompt",
      label: "Prompt",
      type: "DataField",
      required: false,
      description: "The prompt parameter returned by Google",
    },
  ],
});
