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
import type { Account } from "../../entries/account/_account.type.ts";
import { handleGoogleLogin } from "./handle-google-login.ts";
import { SystemSettings } from "@inspatial/cloud/types";

export async function handleGoogleSignup(args: {
  accessToken: GoogleAccessTokenResponse;
  idToken: GoogleIdToken;
  csrfToken: string;
  redirectTo: string;
  inRequest: InRequest;
  inResponse: InResponse;
  orm: InSpatialORM;
  inCloud: InCloud;
}) {
  const { email, emailVerified, givenName, familyName, picture, sub } =
    args.idToken;
  const {
    accessToken,
    idToken,
    redirectTo,
    csrfToken,
    orm,
    inCloud,
    inRequest,
    inResponse,
  } = args;
  const { enableSignup } = await orm.getSettings<SystemSettings>(
    "systemSettings",
  );
  const redirectUrl = new URL(redirectTo);
  if (!enableSignup) {
    return inResponse.redirect(redirectUrl.toString());
  }
  const authHandler = inCloud.auth;
  if (!email || !emailVerified) {
    raiseServerException(401, "Google auth: Email not verified");
  }
  const existingUser = await orm.findEntryId("user", [{
    field: "email",
    op: "=",
    value: email,
  }]);
  if (existingUser) {
    return handleGoogleLogin({
      accessToken,
      idToken,
      redirectTo,
      orm,
      inCloud,
      inRequest,
      inResponse,
      csrfToken,
    });
  }
  const user = orm.getNewEntry<User>("user");
  user.firstName = givenName;
  user.lastName = familyName;
  user.email = email;
  user.googlePicture = picture;
  user.googleCredential = accessToken;
  user.googleAccessToken = accessToken.accessToken;
  user.googleRefreshToken = accessToken.refreshToken;
  user.googlePicture = picture;
  user.googleId = sub;
  user.googleAuthStatus = "authenticated";
  await user.save();
  await orm.createEntry<Account>("account", {
    users: [{
      user: user.id,
    }],
  });
  await authHandler.createUserSession(
    user,
    inRequest,
    inResponse,
  );
  const sessionId = inRequest.context.get<string>("userSession");
  if (!sessionId) {
    raiseServerException(401, "Google auth: Session not found");
  }
  // redirectUrl.searchParams.set("sessionId", sessionId);
  return inResponse.redirect(redirectUrl.toString());
}
