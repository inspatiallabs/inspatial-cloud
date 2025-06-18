import type { CloudConfig } from "#types/mod.ts";
import { InCloudCommon } from "./cloud-common.ts";

export class InCloudQueue extends InCloudCommon {
  constructor(appName: string, config: CloudConfig) {
    super(appName, config, "queue");
  }
  override async run() {
    await super.run();
  }
}
