import { CloudAPIAction } from "~/api/cloud-action.ts";

import { GoogleOAuth } from "~/auth/providers/google/accessToken.ts";
import { raiseServerException } from "~/serve/server-exception.ts";
import type { User } from "~/auth/entries/user/_user.type.ts";

const googleTokenLogin = new CloudAPIAction("googleTokenLogin", {
  authRequired: false,
  async run({ inCloud, orm, inRequest, inResponse, params }) {
    const { accessToken } = params;
    const authSettings = await orm.getSettings("authSettings");
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
    const user = await orm.findEntry<User>("user", [{
      field: "email",
      op: "=",
      value: email,
    }]);

    if (!user) {
      raiseServerException(
        403,
        "Google auth: User not found",
      );
    }
    user.$googleAccessToken = accessToken;
    user.$googlePicture = picture;
    user.$googleId = id;
    await user.save();

    const authHandler = inCloud.auth;
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
