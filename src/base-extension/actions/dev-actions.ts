import { CloudAPIGroup } from "@inspatial/cloud";

export const cloudActions = new CloudAPIGroup("dev", {
  description: "Development actions",
  actions: [],
  label: "Dev",
});

cloudActions.addAction("generateConfig", {
  description: "Generate the cloud-config.json along with the schema",
  params: [],
  async run({ app }) {
    app.generateConfigFile();
  },
});
