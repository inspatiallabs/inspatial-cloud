import { CloudExtension } from "#/cloud-extension.ts";
import userEntry from "#extension/auth/entry-types/user/user-entry.ts";
import userSessionEntry from "#extension/auth/entry-types/user-session/user-session-entry.ts";
import authSettings from "#extension/auth/settings-types/auth-settings/auth-settings.ts";
import authGroup from "#extension/auth/auth-group.ts";
import checkForUser from "#extension/auth/boot/checkForUser.ts";
import { AuthHandler } from "#extension/auth/auth-handler.ts";
import { authServerExtension } from "#extension/auth/serve-extension/mod.ts";

const authCloudExtension: CloudExtension = new CloudExtension({
  key: "auth",
  title: "Auth",
  description: "Auth extension",
  install(app) {
    const handler = new AuthHandler(app);
    app.server.addCustomProperty({
      key: "auth",
      description: "Auth handler",
      value: handler,
    });
    handler.allowPath("/api");
    handler.allowAction("api", "ping");
    for (const group of app.actionGroups.values()) {
      for (const action of group.actions.values()) {
        if (action.includeInAPI && !action.authRequired) {
          handler.allowAction(group.groupName, action.actionName);
        }
      }
    }
  },
  version: "1.0.0",
  serverExtensions: [authServerExtension],
  entryTypes: [userEntry, userSessionEntry],
  boot: checkForUser,
  actionGroups: [authGroup],
  settingsTypes: [authSettings],
});

export default authCloudExtension;
