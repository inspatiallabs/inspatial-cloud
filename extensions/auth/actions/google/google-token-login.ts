import { CloudAPIAction } from "#/api/cloud-action.ts";

import { GoogleOAuth } from "#extensions/auth/providers/google/accessToken.ts";
import type { User } from "#extensions/auth/entry-types/generated-types/user.ts";
import type { AuthHandler } from "#extensions/auth/auth-handler.ts";
import { raiseServerException } from "#/app/server-exception.ts";

const googleTokenLogin = new CloudAPIAction("googleTokenLogin", {
  authRequired: false,
  async run({ app, inRequest, inResponse, params }) {
    const { accessToken } = params;
    const authSettings = await app.orm.getSettings("authSettings");
    const googleAuth = new GoogleOAuth({
      clientId: authSettings.googleClientId,
      clientSecret: authSettings.googleClientSecret,
    });
    const userInfo = await googleAuth.getUserInfo(accessToken);
    if (!userInfo) {
      raiseServerException(
        403,
        "Google auth: Failed to get user info",
      );
    }
    const { email, emailVerified, picture, id } = userInfo;
    if (!emailVerified) {
      raiseServerException(
        403,
        "Google auth: Email not verified",
      );
    }
    const user = await app.orm.findEntry<User>("user", {
      email,
    });

    if (!user) {
      raiseServerException(
        403,
        "Google auth: User not found",
      );
    }
    user.googleAccessToken = accessToken;
    user.googlePicture = picture;
    user.googleId = id;
    await user.save();

    const authHandler = app.getExtension<AuthHandler>("auth");
    const sessionData = await authHandler.createUserSession(
      user,
      inRequest,
      inResponse,
    );
    return sessionData;
  },
  params: [{
    key: "accessToken",
    type: "TextField",
    description: "Access token from Google OAuth2",
    label: "Access Token",
    required: true,
  }],
});

export default googleTokenLogin;
