import { CloudExtension } from "#/app/cloud-extension.ts";
import { corsMiddleware } from "#/base-extension/middleware/cors.ts";
import { cloudConfig } from "#/base-extension/config.ts";
import { inLiveMiddleware } from "#/base-extension/middleware/inLive.ts";
import { apiPathHandeler } from "#/api/api-handler.ts";
import systemSettings from "#/base-extension/settings-types/systemSettings.ts";
import filesMiddleware from "#/base-extension/middleware/fileUploads.ts";

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
  middleware: [corsMiddleware, inLiveMiddleware, filesMiddleware],
  pathHandlers: [apiPathHandeler],
});
