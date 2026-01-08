import { defineAPIAction } from "~/api/cloud-action.ts";
import { raiseCloudException } from "@inspatial/cloud";
import type { InSpatialORM } from "../../orm/mod.ts";
import type { User } from "#types/models.ts";

export const verifyUserEmail = defineAPIAction("verifyUserEmail", {
  description: "Verify the email for a new user",
  authRequired: false,
  async action({ inCloud, orm, params: { token }, inRequest, inResponse }) {
    const host = await inCloud.getServerHost();
    const url = new URL(host);
    let message = "";
    let type = "";
    try {
      const user = await verifyToken(orm, token);
      if (user) {
        await inCloud.auth.createUserSession(user, inRequest, inResponse);
        type = "success";
        message = "Your email has been verified!";
      }
    } catch (e) {
      if (Error.isError(e)) {
        inCloud.inLog.error(e.message, {
          subject: e.name,
          stackTrace: e.stack,
        });
      }

      inCloud.inLog.error(Deno.inspect(e));
      message = "There was a problem verifying your account";
      type = "error";
    }
    if (message) {
      url.searchParams.set("message", message);
    }
    if (type) {
      url.searchParams.set("type", type);
    }
    return inResponse.redirect(url.toString());
  },
  params: [{
    key: "token",
    type: "TextField",
    required: true,
  }],
});

async function verifyToken(
  orm: InSpatialORM,
  token: string,
): Promise<User> {
  const [userId, verifyToken] = atob(token).split(":");
  if (!userId) {
    raiseCloudException("No user id");
  }
  if (!verifyToken) {
    raiseCloudException("No verify token");
  }
  const user = await orm.getEntry("user", userId);
  const verified = await user.runAction("verifyToken", {
    token: verifyToken,
  }) as Promise<
    boolean
  >;
  if (!verified) {
    raiseCloudException("User not verified");
  }
  return user;
}
