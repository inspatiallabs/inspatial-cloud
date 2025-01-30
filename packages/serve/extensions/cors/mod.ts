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

const corsExtension: ServerExtension<"CORS", void> = ServerExtension.create(
  "CORS",
  {
    description: "CORS Handler for InSpatialServer",
    envPrefix: "CORS",
    config: {
      allowedOrigins: {
        description: "Allowed Origins",
        required: false,
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
        if (origins?.has(inRequest.origin)) {
          inResponse.setAllowOrigin(inRequest.origin);
        }
      },
    }],
  },
);

export default corsExtension;
