import type { InCloud } from "~/in-cloud.ts";
import type { InSpatialORM } from "~/orm/inspatial-orm.ts";
import type { InRequest } from "~/serve/in-request.ts";
import type { InResponse } from "~/serve/in-response.ts";
import type {
  GoogleAccessTokenResponse,
  GoogleIdToken,
} from "~/auth/providers/google/accessToken.ts";
import {
  isServerException,
  raiseServerException,
} from "~/serve/server-exception.ts";

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
  const redirectUrl = new URL(redirectTo);

  const host = await inCloud.getServerHost();

  const redirect = (message: string, type: string) => {
    const url = new URL(`${host}/login`);
    url.searchParams.set("message", message);
    url.searchParams.set("type", type);
    return inResponse.redirect(url.toString());
  };
  if (!email || !emailVerified) {
    inCloud.inLog.error("Google auth: Email not verified", {
      subject: "Google OAuth",
    });
    return redirect("There was a problem authenticating with google", "error");
  }
  const user = await orm.findEntry("user", [{
    field: "email",
    op: "=",
    value: email,
  }]);
  if (!user) {
    inCloud.inLog.error("Google auth: User not found", {
      subject: "Google OAuth",
    });
    return redirect("There was a problem authenticating with google", "error");
  }
  user.$googleCredential = accessToken as any;
  user.$googleAccessToken = accessToken.accessToken;
  user.$googleRefreshToken = accessToken.refreshToken;
  user.$googlePicture = idToken.picture;
  user.$googleId = idToken.sub;
  user.$googleAuthStatus = "authenticated";
  await user.save();
  try {
    await authHandler.createUserSession(
      user,
      inRequest,
      inResponse,
    );
  } catch (e) {
    if (isServerException(e)) {
      if (e.message.match(/not\sverified/)) {
        return redirect(e.message, "error");
      }
      inCloud.inLog.error(Deno.inspect(e), { subject: "Google OAuth" });
      return redirect(
        "There was a problem authenticating with google",
        "error",
      );
    }
  }
  const sessionId = inRequest.context.get<string>("userSession");
  if (!sessionId) {
    inCloud.inLog.error("Google auth: Session not found", {
      subject: "Google OAuth",
    });
    return redirect("There was a problem authenticating with google", "error");
  }
  // redirectUrl.searchParams.set("sessionId", sessionId);
  return inResponse.redirect(redirectUrl.toString());
}
