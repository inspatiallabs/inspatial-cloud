import { CloudExtension } from "/app/cloud-extension.ts";
import { parseUserAgent } from "#extensions/user-agent/src/parse.ts";

export const userAgentExtension = new CloudExtension("userAgent", {
  label: "User Agent",
  description: "This extension provides user-agent parsing",
  config: {
    userAgentDebug: {
      type: "boolean",
      description: "Enable user agent printing to console",
      default: true,
    },
    userAgentEnabled: {
      type: "boolean",
      description: "Enable user agent parsing",
      default: true,
    },
  },
  requestLifecycle: {
    setup: [{
      name: "parseUserAgent",
      handler(inRequest, config) {
        if (!config.userAgentEnabled) return;

        const agent = parseUserAgent(inRequest.headers.get("user-agent"));
        inRequest.context.register("userAgent", agent);

        if (config.userAgentDebug) {
          const userAgent = inRequest.context.get("userAgent");
          console.log({ userAgent });
        }
      },
    }],
  },
  install() {},
}) as CloudExtension;
