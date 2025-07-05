import type { CloudExtension } from "~/extension/cloud-extension.ts";

export type AppMode = "development" | "production";

export interface CloudConfig {
  extensions?: Array<CloudExtension>;
}
