import {
  type GoogleAccessTokenResponse,
  type GoogleIdToken,
  GoogleOAuth,
} from "#extensions/auth/providers/google/accessToken.ts";
import type { AuthSettings } from "#extensions/auth/generated-interfaces/settings/auth-settings.ts";
import type { AuthHandler } from "#extensions/auth/auth-handler.ts";
import type { User } from "#extensions/auth/entry-types/generated-types/user.ts";
import { CloudAPIAction } from "~/api/cloud-action.ts";

import { raiseServerException } from "~/app/server-exception.ts";
import type { InRequest } from "~/app/in-request.ts";
import type { InResponse } from "~/app/in-response.ts";
import type { InCloud } from "~/cloud/cloud-common.ts";

const googleAuthCallback = new CloudAPIAction("googleAuthCallback", {
  authRequired: false,
  description: "Google OAuth2 callback",
  async run({ inCloud, orm, inRequest, inResponse, params }) {
    const { code, state } = params;
    const authSettings = await orm.getSettings<AuthSettings>(
      "authSettings",
    );
    if (!authSettings.googleClientId || !authSettings.googleClientSecret) {
      raiseServerException(
        400,
        "Google auth: Client ID or Client Secret not set in settings",
      );
    }
    const redirectUri = `${
      authSettings.hostname || inRequest.fullHost
    }/api?group=auth&action=googleAuthCallback`;
    const parsedState = JSON.parse(state);
    const { redirectTo, csrfToken, type } = parsedState;
    const googleAuth = new GoogleOAuth({
      clientId: authSettings.googleClientId,
      clientSecret: authSettings.googleClientSecret,
    });
    const accessToken = await googleAuth.getAccessToken({
      code: code,
      redirectUri,
    });
    if (type) {
      switch (type) {
        case "login":
          if (!accessToken || !accessToken.idToken) {
            raiseServerException(
              400,
              "Google auth: Failed to get access token",
            );
          }
          return await handleGoogleLogin({
            accessToken,
            idToken: accessToken.idToken,
            csrfToken,
            redirectTo,
            inRequest,
            inResponse,
            inCloud,
          });
        default:
          raiseServerException(400, "Invalid type");
      }
    }
  },
  params: [{
    key: "code",
    label: "Code",
    type: "TextField",
    required: true,
    description: "The authorization code returned by Google",
  }, {
    key: "state",
    label: "State",
    type: "TextField",
    required: true,
    description: "The state parameter returned by Google",
  }, {
    key: "scope",
    label: "Scope",
    type: "TextField",
    required: true,
    description: "The scope parameter returned by Google",
  }, {
    key: "authuser",
    label: "Auth User",
    type: "DataField",
    required: false,
    description: "The authuser parameter returned by Google",
  }, {
    key: "hd",
    label: "HD",
    type: "DataField",
    required: false,
    description: "The hd parameter returned by Google",
  }, {
    key: "prompt",
    label: "Prompt",
    type: "DataField",
    required: false,
    description: "The prompt parameter returned by Google",
  }],
});

export default googleAuthCallback;

async function handleGoogleLogin(args: {
  accessToken: GoogleAccessTokenResponse;
  idToken: GoogleIdToken;
  csrfToken: string;
  redirectTo: string;
  inRequest: InRequest;
  inResponse: InResponse;
  inCloud: InCloud;
}) {
  const { email, emailVerified } = args.idToken;
  const {
    accessToken,
    idToken,
    redirectTo,
    inCloud,
    inRequest,
    inResponse,
  } = args;
  const authHandler = inCloud.getExtension<AuthHandler>("auth");
  if (!email || !emailVerified) {
    raiseServerException(401, "Google auth: Email not verified");
  }
  const user = await inCloud.orm.findEntry<User>("user", [{
    field: "email",
    op: "=",
    value: email,
  }]);
  if (!user) {
    raiseServerException(401, "Google auth: User not found");
  }
  user.googleCredential = accessToken;
  user.googleAccessToken = accessToken.accessToken;
  user.googleRefreshToken = accessToken.refreshToken;
  user.googlePicture = idToken.picture;
  user.googleId = idToken.sub;
  user.googleAuthStatus = "authenticated";
  await user.save();
  await authHandler.createUserSession(
    user,
    inRequest,
    inResponse,
  );
  const sessionId = inRequest.context.get<string>("userSession");
  if (!sessionId) {
    raiseServerException(401, "Google auth: Session not found");
  }
  const redirectUrl = new URL(redirectTo);
  // redirectUrl.searchParams.set("sessionId", sessionId);
  return inResponse.redirect(redirectUrl.toString());
}
