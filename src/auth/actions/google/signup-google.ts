import { CloudAPIAction } from "@inspatial/cloud";
import { raiseServerException } from "../../../serve/server-exception.ts";
import { generateId } from "../../../utils/misc.ts";
import type { AuthSettings } from "../../settings/_auth-settings.type.ts";

export const signupWithGoogle = new CloudAPIAction("signupWithGoogle", {
  authRequired: false,
  description: "Sign up with Google",
  async run({ orm, inRequest, params }) {
    const { csrfToken, redirectTo } = params;
    const state = JSON.stringify({
      redirectTo,
      csrfToken,
      type: "signup",
    });
    const authSettings = await orm.getSettings<AuthSettings>(
      "authSettings",
    );
    const clientId = authSettings.googleClientId;
    if (!clientId) {
      raiseServerException(
        400,
        "Google auth: Client ID not set in settings",
      );
    }
    const redirectUri = `${
      authSettings.hostname || inRequest.fullHost
    }/api?group=auth&action=googleAuthCallback`;

    const url = new URL(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );

    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("prompt", "consent");
    const nonce = generateId(30);
    url.searchParams.set("nonce", nonce);
    url.searchParams.set("state", state);
    return {
      redirect: url.toString(),
    };
  },
  params: [{
    key: "redirectTo",
    label: "Redirect To",
    type: "TextField",
    required: false,
    description: "The redirect URI to use for the Google OAuth2 login",
  }, {
    key: "csrfToken",
    label: "CSRF Token",
    type: "DataField",
    required: false,
    description: "The CSRF token to use for the Google OAuth2 login",
  }],
});
