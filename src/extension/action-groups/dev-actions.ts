import { CloudAPIGroup } from "@inspatial/cloud";

export const devActions = new CloudAPIGroup("dev", {
  description: "Development actions",
  actions: [],
  label: "Dev",
});

devActions.addAction("generateConfig", {
  description: "Generate the cloud-config.json along with the schema",
  params: [],
  run({ inCloud }) {
    inCloud.generateConfigFile();
  },
});
