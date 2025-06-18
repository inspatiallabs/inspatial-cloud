import type { CloudExtension } from "../app/cloud-extension.ts";

export type AppMode = "development" | "production";

export interface CloudConfig {
  extensions?: Array<CloudExtension>;
}
