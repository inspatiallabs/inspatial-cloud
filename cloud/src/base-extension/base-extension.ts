import { CloudExtension } from "#/app/cloud-extension.ts";
import { corsMiddleware } from "#/base-extension/middleware/cors.ts";
import { cloudConfig } from "#/base-extension/config.ts";
import { inLiveMiddleware } from "#/base-extension/middleware/inLive.ts";
import { apiPathHandeler } from "#/api/api-handler.ts";

export const baseExtension = new CloudExtension("cloud", {
  description: "InSpatial Cloud Base Extension",
  install() {},
  label: "InSpatial Cloud Base Extension",
  version: "0.0.1",
  config: cloudConfig,
  actionGroups: [],
  middleware: [corsMiddleware, inLiveMiddleware],
  pathHandlers: [apiPathHandeler],
});
