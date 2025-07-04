import { userSessionEntry } from "./entry-types/user-session/user-session-entry.ts";
import { authSettings } from "./settings-types/auth-settings/auth-settings.ts";
import { userEntry } from "./entry-types/user/user-entry.ts";
import { staticFilesHandler } from "~/static/staticPathHandler.ts";
import { apiPathHandler } from "~/api/api-handler.ts";
import { account } from "./entry-types/account/account.ts";
import { AuthHandler } from "./auth-handler.ts";
import { CloudExtension } from "../app/cloud-extension.ts";
import { authMiddleware } from "./auth-middleware.ts";
import { authLifecycle } from "./auth-lifecycle.ts";
import checkForUser from "./boot/checkForUser.ts";
import authGroup from "./auth-group.ts";

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
  entryTypes: [userEntry, userSessionEntry, account],
  boot: checkForUser,
  actionGroups: [authGroup],
  settingsTypes: [authSettings],
});
