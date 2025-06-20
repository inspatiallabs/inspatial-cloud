// import { createAction } from "#/actions/createAction.ts";
// import { getAccessToken } from "#/package/googlePack/googleSettings.ts";
// import { raiseRedirect } from "#/easyException.ts";

// const redirectAction = createAction("redirect", {
//   description: "Redirect from Google OAuth",
//   async action(app, data, request, response) {
//     const emailSettings = await app.orm.getSettings("emailSettings");
//     const redirectHost = emailSettings.redirectHost;

//     const { code, scope, state: accountEntryId } = data;
//     const token = await getAccessToken({
//       code,
//       clientId: emailSettings.clientId,
//       clientSecret: emailSettings.clientSecret,
//       redirectUri: `${redirectHost}/api?group=email&action=redirect`,
//     });
//     const emailAccount = await app.orm.getEntry("emailAccount", accountEntryId);
//     emailAccount.accessToken = token.access_token;
//     emailAccount.acquiredTime = new Date().getTime();
//     emailAccount.expireTime = emailAccount.acquiredTime +
//       token.expires_in * 1000;
//     emailAccount.tokenType = token.token_type;
//     emailAccount.refreshToken = token.refresh_token;
//     emailAccount.scope = token.scope;
//     emailAccount.authStatus = "authorized";

//     await emailAccount.save();
//     const redirectFinal = emailSettings.redirectFinal;
//     raiseRedirect(`${redirectFinal}`);
//   },
//   params: {
//     code: {
//       type: "TextField",
//       required: true,
//     },
//     scope: {
//       type: "TextField",
//       required: true,
//     },
//     state: {
//       type: "DataField",
//       required: false,
//     },
//   },
// });
