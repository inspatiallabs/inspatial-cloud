import { CloudAPIAction } from "~/api/cloud-action.ts";

import { raiseServerException } from "~/serve/server-exception.ts";
import { GoogleOAuth } from "../../providers/google/accessToken.ts";
import { handleGoogleLogin } from "./handle-google-login.ts";
import { handleGoogleSignup } from "./handle-google-signup.ts";

const googleAuthCallback = new CloudAPIAction("googleAuthCallback", {
  authRequired: false,
  description: "Google OAuth2 callback",
  async run({ inCloud, orm, inRequest, inResponse, params }) {
    const { code, state } = params;
    const authSettings = await orm.getSettings(
      "authSettings",
    );
    if (!authSettings.$googleClientId || !authSettings.$googleClientSecret) {
      raiseServerException(
        400,
        "Google auth: Client ID or Client Secret not set in settings",
      );
    }
    const redirectUri = `${
      authSettings.$hostname || inRequest.fullHost
    }/api?group=auth&action=googleAuthCallback`;
    const parsedState = JSON.parse(state);
    const { redirectTo, csrfToken, type } = parsedState;
    const googleAuth = new GoogleOAuth({
      clientId: authSettings.$googleClientId,
      clientSecret: authSettings.$googleClientSecret,
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
            orm,
          });
        case "signup":
          if (!accessToken || !accessToken.idToken) {
            raiseServerException(
              400,
              "Google auth: Failed to get access token",
            );
          }
          return await handleGoogleSignup({
            accessToken,
            idToken: accessToken.idToken,
            csrfToken,
            redirectTo,
            inRequest,
            inResponse,
            inCloud,
            orm,
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
