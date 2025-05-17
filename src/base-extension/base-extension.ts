import { CloudExtension } from "#/app/cloud-extension.ts";
import { corsMiddleware } from "#/base-extension/middleware/cors.ts";
import { cloudConfig } from "#/base-extension/config.ts";
import { inLiveMiddleware } from "#/base-extension/middleware/inLive.ts";
import { apiPathHandeler } from "#/api/api-handler.ts";
import systemSettings from "#/base-extension/settings-types/systemSettings.ts";

export const baseExtension = new CloudExtension("cloud", {
  description: "InSpatial Cloud Base Extension",
  install(app) {
    Deno.mkdirSync(app.filesPath, { recursive: true });
  },
  label: "InSpatial Cloud Base Extension",
  version: "0.0.1",
  config: cloudConfig,
  actionGroups: [],
  settingsTypes: [systemSettings],
  entryTypes: [],
  middleware: [corsMiddleware, inLiveMiddleware],
  pathHandlers: [apiPathHandeler],
  roles: [{
    roleName: "systemAdmin",
    label: "System Administrator",
    description: "Super user role assigned to the system administrators",
  }, {
    roleName: "basic",
    label: "Basic User",
    description: "The default limited role assigned to new users",
  }],
});
