import {
  type GoogleAccessTokenResponse,
  type GoogleIdToken,
  GoogleOAuth,
} from "#extensions/auth/providers/google/accessToken.ts";
import type { AuthSettings } from "#extensions/auth/generated-interfaces/settings/auth-settings.ts";
import type { InSpatialCloud } from "#/inspatial-cloud.ts";
import type { AuthHandler } from "#extensions/auth/auth-handler.ts";
import type { User } from "#extensions/auth/entry-types/generated-types/user.ts";
import { CloudAPIAction } from "#/app/cloud-action.ts";
import { raiseServerException } from "#/app/server-exception.ts";
import type { InRequest } from "#/app/in-request.ts";
import type { InResponse } from "#/app/in-response.ts";

const googleAuthCallback = new CloudAPIAction("googleAuthCallback", {
  authRequired: false,
  description: "Google OAuth2 callback",
  async run({ app, inRequest, inResponse, params }) {
    const { code, state } = params;
    const authSettings = await app.orm.getSettings<AuthSettings>(
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
            app,
          });
        default:
          raiseServerException(400, "Invalid type");
      }
    }
  },
  params: [{
    key: "code",
    type: "string",
    required: true,
    description: "The authorization code returned by Google",
  }, {
    key: "state",
    type: "string",
    required: true,
    description: "The state parameter returned by Google",
  }, {
    key: "scope",
    type: "string",
    required: true,
    description: "The scope parameter returned by Google",
  }, {
    key: "authuser",
    type: "string",
    required: false,
    description: "The authuser parameter returned by Google",
  }, {
    key: "hd",
    type: "string",
    required: false,
    description: "The hd parameter returned by Google",
  }, {
    key: "prompt",
    type: "string",
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
  app: InSpatialCloud;
}) {
  const { email, emailVerified } = args.idToken;
  const {
    accessToken,
    idToken,
    redirectTo,
    app,
    inRequest,
    inResponse,
  } = args;
  const authHandler = app.getExtension<AuthHandler>("auth");
  if (!email || !emailVerified) {
    raiseServerException(401, "Google auth: Email not verified");
  }
  const user = await app.orm.findEntry<User>("user", {
    email,
  });
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
