import { CloudExtension } from "#/cloud-extension.ts";
import { CloudActionGroup } from "#/cloud-action.ts";
import generateModels from "./actions/generate-models.ts";

const flutterExtension = new CloudExtension({
  key: "flutter",
  title: "Flutter Extension",
  description: "A Flutter extension for InSpatial",
  install() {},
  version: "0.0.1",
  actionGroups: [
    new CloudActionGroup("flutter", {
      description: "Flutter Actions",
      label: "Flutter",
      actions: [generateModels],
    }),
  ],
});

export default flutterExtension;
