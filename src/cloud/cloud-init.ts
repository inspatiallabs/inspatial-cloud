import {
  generateConfigSchema,
  loadCloudConfigFile,
} from "../cloud-config/cloud-config.ts";
import { initCloud } from "../init.ts";
import { InCloud } from "./cloud-common.ts";

export class InCloudInit extends InCloud {
  constructor(appName: string, config: any) {
    super(appName, config, "init");
  }

  override init() {
    const config = loadCloudConfigFile(this.cloudRoot);
    if (!config) {
      super.init();
      generateConfigSchema(this);
      initCloud(this);
    }
    // Additional initialization logic for InCloudInit can be added here
  }
}
