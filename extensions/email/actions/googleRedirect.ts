import { CloudAPIAction } from "/api/cloud-action.ts";
import { getAccessToken } from "../entryTypes/emailAccountEntry.ts";
import { Redirect } from "/app/server-exception.ts";

export const redirectAction = new CloudAPIAction("redirect", {
  description: "Redirect from Google OAuth",

  async run({ inCloud, inRequest, inResponse, params, orm }) {
    const emailSettings = await orm.getSettings("emailSettings");
    const redirectHost = emailSettings.redirectHost;

    const { code, scope, state: accountEntryId } = params;
    const token = await getAccessToken({
      code,
      clientId: emailSettings.clientId,
      clientSecret: emailSettings.clientSecret,
      redirectUri: `${redirectHost}/api?group=email&action=redirect`,
    });
    const emailAccount = await orm.getEntry("emailAccount", accountEntryId);
    emailAccount.accessToken = token.access_token;
    emailAccount.acquiredTime = new Date().getTime();
    emailAccount.expireTime = emailAccount.acquiredTime +
      token.expires_in * 1000;
    emailAccount.tokenType = token.token_type;
    emailAccount.refreshToken = token.refresh_token;
    emailAccount.scope = token.scope;
    emailAccount.authStatus = "authorized";
    await emailAccount.save();
    const redirectFinal = emailSettings.redirectFinal;
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
