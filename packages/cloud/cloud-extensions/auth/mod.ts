import { ServerExtension } from "@inspatial/serve";
import { CloudExtension } from "#/cloud-extension.ts";
import userEntry from "#extension/auth/entry-types/user/user-entry.ts";
import userSessionEntry from "#extension/auth/entry-types/user-session/user-session-entry.ts";
import authSettings from "#extension/auth/settings-types/auth-settings/auth-settings.ts";
import authGroup from "#extension/auth/auth-group.ts";
import type { InSpatialORM } from "#orm";
import checkForUser from "#extension/auth/boot/checkForUser.ts";

const authServerExtension = new ServerExtension("auth", {
  description: "Auth extension",
  requestLifecycle: {
    setup: [{
      name: "parseAuth",
      handler(inRequest) {
        if (inRequest.method === "OPTIONS") {
          return;
        }
        inRequest.context.register("user", null);
        inRequest.context.register("authToken", null);
        inRequest.context.register("userSession", null);
        const authHeader = inRequest.headers.get("Authorization");
        if (authHeader) {
          const parts = authHeader.split(" ");
          if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
            inRequest.context.update("authToken", parts[1]);
          }
        }
        const userSessionId = inRequest.cookies.get("userSession");
        if (userSessionId) {
          inRequest.context.update("userSession", userSessionId);
        }
      },
    }],
  },
  middleware: [{
    name: "auth",
    description: "Auth middleware",
    async handler(server, inRequest, inResponse) {
      if (inRequest.method === "OPTIONS") {
        return;
      }
      const sessionId = inRequest.context.get("userSession");
      if (!sessionId) {
        return;
      }

      const orm = server.getCustomProperty<InSpatialORM>("orm");
      const userSession = await orm.getEntry("userSession", sessionId);
      if (!userSession) {
        return;
      }
      inRequest.context.update("user", userSession.sessionData);
    },
  }],
  install(server) {},
});

const authCloudExtension: CloudExtension = new CloudExtension({
  key: "auth",
  title: "Auth",
  description: "Auth extension",
  install() {},
  version: "1.0.0",
  serverExtensions: [authServerExtension],
  entryTypes: [userEntry, userSessionEntry],
  boot: checkForUser,
  actionGroups: [authGroup],
  settingsTypes: [authSettings],
});

export default authCloudExtension;
