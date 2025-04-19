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

export * from "#extensions/user-agent/src/user-agent.ts";
export * from "#extensions/user-agent/src/types.ts";
export * from "#extensions/user-agent/src/matchers.ts";
export * from "#extensions/user-agent/src/helpers.ts";
export * from "#extensions/user-agent/src//parse.ts";
export * from "#extensions/user-agent/src/runtime.ts";
import { userAgentExtension } from "#extensions/user-agent/src/extension.ts";

export default userAgentExtension;
