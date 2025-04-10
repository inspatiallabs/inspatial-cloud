import { CloudAction } from "#/cloud-action.ts";
import cloudLogger from "#/cloud-logger.ts";
import { GoogleOAuth } from "#extension/auth/providers/google/accessToken.ts";
import type { User } from "#extension/auth/entry-types/generated-types/user.ts";
import { raiseServerException } from "@inspatial/serve";
import type { AuthHandler } from "#extension/auth/auth-handler.ts";

const googleTokenLogin = new CloudAction("googleTokenLogin", {
  authRequired: false,
  async run({ app, inRequest, inResponse, params }) {
    const { accessToken } = params;
    cloudLogger.info({ accessToken });
    const authSettings = await app.orm.getSettings("authSettings");
    const googleAuth = new GoogleOAuth({
      clientId: authSettings.googleClientId,
      clientSecret: authSettings.googleClientSecret,
    });
    const userInfo = await googleAuth.getUserInfo(accessToken);
    cloudLogger.info(userInfo);
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

    const authHandler = app.server.getCustomProperty<AuthHandler>("auth");
    const sessionData = await authHandler.createUserSession(
      user,
      inRequest,
      inResponse,
    );
    cloudLogger.info({ sessionData });
    return sessionData;
  },
  params: [{
    key: "accessToken",
    type: "string",
    description: "Access token from Google OAuth2",
    label: "Access Token",
    required: true,
  }],
});

export default googleTokenLogin;
