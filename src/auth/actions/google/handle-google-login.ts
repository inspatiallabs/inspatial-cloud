import type { InCloud } from "~/in-cloud.ts";
import type { InSpatialORM } from "~/orm/inspatial-orm.ts";
import type { InRequest } from "~/serve/in-request.ts";
import type { InResponse } from "~/serve/in-response.ts";
import type {
  GoogleAccessTokenResponse,
  GoogleIdToken,
} from "~/auth/providers/google/accessToken.ts";
import { raiseServerException } from "~/serve/server-exception.ts";
import type { User } from "../../entries/user/_user.type.ts";

export async function handleGoogleLogin(args: {
  accessToken: GoogleAccessTokenResponse;
  idToken: GoogleIdToken;
  csrfToken: string;
  redirectTo: string;
  inRequest: InRequest;
  inResponse: InResponse;
  orm: InSpatialORM;
  inCloud: InCloud;
}) {
  const { email, emailVerified } = args.idToken;
  const {
    accessToken,
    idToken,
    redirectTo,
    orm,
    inCloud,
    inRequest,
    inResponse,
  } = args;
  const authHandler = inCloud.auth;
  if (!email || !emailVerified) {
    raiseServerException(401, "Google auth: Email not verified");
  }
  const user = await orm.findEntry<User>("user", [{
    field: "email",
    op: "=",
    value: email,
  }]);
  if (!user) {
    raiseServerException(401, "Google auth: User not found");
  }
  user.$googleCredential = accessToken;
  user.$googleAccessToken = accessToken.accessToken;
  user.$googleRefreshToken = accessToken.refreshToken;
  user.$googlePicture = idToken.picture;
  user.$googleId = idToken.sub;
  user.$googleAuthStatus = "authenticated";
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
