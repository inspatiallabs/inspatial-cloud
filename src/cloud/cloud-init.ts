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
  validateConfig() {
    const config = loadCloudConfigFile(this.cloudRoot);
    this.init();
    if (!config) {
      generateConfigSchema(this);
      initCloud(this);
    }
  }
}
