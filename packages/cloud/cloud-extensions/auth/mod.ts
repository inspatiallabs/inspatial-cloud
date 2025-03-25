import { ServerExtension } from "@inspatial/serve";
import { CloudExtension } from "#/cloud-extension.ts";
import userEntry from "#extension/auth/entry-types/user/user-entry.ts";
import userSessionEntry from "#extension/auth/entry-types/user-session/user-session-entry.ts";

const authServerExtension = new ServerExtension("auth", {
  description: "Auth extension",
  requestLifecycle: {
    setup: [{
      name: "parseAuth",
      handler(inRequest) {
        const authHeader = inRequest.headers.get("Authorization");
        if (authHeader) {
          const parts = authHeader.split(" ");
          if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
            inRequest.context.register("authToken", parts[1]);
          }
        }
      },
    }],
  },
  install(server) {},
});

const authCloudExtension: CloudExtension = new CloudExtension({
  key: "auth",
  title: "Authentication",
  description: "Auth extension",
  install() {},
  version: "1.0.0",
  serverExtensions: [authServerExtension],
  entryTypes: [userEntry, userSessionEntry],
  actionGroups: [],
  settingsTypes: [],
});

export default authCloudExtension;
