import { CloudExtension } from "#/app/cloud-extension.ts";
import { CloudAPIGroup } from "#/app/cloud-action.ts";
import generateModels from "./actions/generate-models.ts";

const flutterExtension = new CloudExtension({
  key: "flutter",
  title: "Flutter Extension",
  description: "A Flutter extension for InSpatial",
  install() {},
  version: "0.0.1",
  actionGroups: [
    new CloudAPIGroup("flutter", {
      description: "Flutter Actions",
      label: "Flutter",
      actions: [generateModels],
    }),
  ],
});

export default flutterExtension as CloudExtension;
