import type { InSpatialCloud } from "#/inspatial-cloud.ts";
import type { User } from "#extension/auth/entry-types/generated-types/user.ts";
import type { InRequest, InResponse } from "@inspatial/serve";
import type { UserSession } from "#extension/auth/entry-types/generated-types/user-session.ts";
import type { SessionData } from "#extension/auth/types.ts";

export async function createUserSession(
  app: InSpatialCloud,
  user: User,
  request: InRequest,
  response: InResponse,
): Promise<SessionData> {
  const sessionData: SessionData = {
    userId: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    systemAdmin: user.systemAdmin ?? false,
  };
  console.log("Creating user session", sessionData);
  const session = await app.orm.createEntry<UserSession>("userSession", {
    user: user.id,
    sessionData,
  });
  // app.cacheSet("userSession", session.id, session.sessionData as any);
  response.setCookie("userSession", session.id);
  request.context.update("user", sessionData);
  return sessionData;
}
