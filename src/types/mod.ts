import type { CloudExtension } from "~/extension/cloud-extension.ts";

export type AppMode = "development" | "production";

export interface CloudConfig {
  projectRoot?: string;
  dbClientQuery?: (query: string) => Promise<any>;
  extensions?: Array<CloudExtension>;
}
