/**
 * This extension provides user-agent parsing for { @link InSpatialServer }
 * @module userAgent
 * @example
 * ```ts
 * import { InSpatialServer } from "@inspatial/serve";
 * import userAgentExtension from "@inspatial/serve/user-agent";
 *
 * const server = await InSpatialServer.create({
 *  extensions: [userAgentExtension],
 * });
 *
 * server.run();
 * ```
 */

export * from "#user-agent/user-agent.ts";
export * from "#user-agent/types.ts";
export * from "#user-agent/matchers.ts";
export * from "#user-agent/helpers.ts";
export * from "#user-agent/parse.ts";
export * from "#user-agent/runtime.ts";
import { userAgentExtension } from "#user-agent/extension.ts";

export default userAgentExtension;
