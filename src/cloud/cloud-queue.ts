import type { CloudConfig } from "#types/mod.ts";
import { InCloud } from "./cloud-common.ts";

export class InCloudQueue extends InCloud {
  constructor(appName: string, config: CloudConfig) {
    super(appName, config, "queue");
  }
  override async run() {
    await super.run();
  }
}
