/**
 * CORS Extension for {@link InSpatialServer}
 * @module corsExtension
 * @example
 * ```ts
 * import { InSpatialServer } from "@inspatial/serve";
 * import corsExtension from "@inspatial/serve/cors";
 *
 * const server = await InSpatialServer.create({
 *   extensions: [corsExtension],
 * });
 *
 * server.run();
 * ```
 */
import { ServerExtension } from "#/extension/server-extension.ts";

/**
 * CORS Extension for {@link InSpatialServer}
 */

const corsExtension = new ServerExtension(
  "CORS",
  {
    description: "CORS Handler for InSpatialServer",
    config: {
      allowedOrigins: {
        description: "Allowed Origins",
        required: false,
        default: ["*"],
        type: "string[]",
      },
    },
    install: () => {},
    middleware: [{
      name: "CORS Middleware",
      description: "CORS Middleware for InSpatialServer",
      handler(server, inRequest, inResponse) {
        const origins = server.getExtensionConfigValue<Set<string>>(
          "CORS",
          "allowedOrigins",
        );

        if (origins?.has(inRequest.origin) || origins?.has("*")) {
          inResponse.setAllowOrigin(inRequest.origin);
        }
      },
    }],
  },
);

/**
 * CORS Extension for {@link InSpatialServer}
 * @example
 * ```ts
 * import { InSpatialServer } from "@inspatial/serve";
 * import corsExtension from "@inspatial/serve/cors";
 *
 * const server = await InSpatialServer.create({
 *   extensions: [corsExtension],
 * });
 *
 * server.run();
 * ```
 */
export default corsExtension as ServerExtension<"CORS", void>;
