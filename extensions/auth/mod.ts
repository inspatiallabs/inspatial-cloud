import { CloudExtension } from "~/app/cloud-extension.ts";

import authGroup from "#extensions/auth/auth-group.ts";
import checkForUser from "#extensions/auth/boot/checkForUser.ts";
import { AuthHandler } from "#extensions/auth/auth-handler.ts";
import { authLifecycle } from "#extensions/auth/auth-lifecycle.ts";
import { authMiddleware } from "#extensions/auth/auth-middleware.ts";
import { userSessionEntry } from "./entry-types/user-session/user-session-entry.ts";
import { authSettings } from "./settings-types/auth-settings/auth-settings.ts";
import { userEntry } from "./entry-types/user/user-entry.ts";
import { staticFilesHandler } from "~/static/staticPathHandler.ts";
import { apiPathHandler } from "~/api/api-handler.ts";

export const authCloudExtension: CloudExtension = new CloudExtension("auth", {
  label: "Auth",
  description: "Auth extension",
  install(app, config) {
    const handler = new AuthHandler(app);
    handler.allowPath(apiPathHandler.match);
    handler.allowPath(staticFilesHandler.match);

    for (const group of app.actionGroups.values()) {
      for (const action of group.actions.values()) {
        if (config.allowAll === true) {
          handler.allowAction(group.groupName, action.actionName);
          continue;
        }
        if (action.includeInAPI && !action.authRequired) {
          handler.allowAction(group.groupName, action.actionName);
        }
      }
    }
    return handler;
  },
  version: "1.0.0",
  config: {
    allowAll: {
      type: "boolean",
      description: "Allow all users to access the app",
      required: false,
    },
  },
  requestLifecycle: {
    setup: [authLifecycle],
  },
  middleware: [authMiddleware],
  entryTypes: [userEntry, userSessionEntry],
  boot: checkForUser,
  actionGroups: [authGroup],
  settingsTypes: [authSettings],
});
