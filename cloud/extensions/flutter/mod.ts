import { CloudExtension } from "#/app/cloud-extension.ts";
import { CloudAPIGroup } from "#/app/cloud-action.ts";
import generateModels from "./actions/generate-models.ts";

const flutterExtension = new CloudExtension("flutter", {
  label: "Flutter Extension",
  description: "A Flutter extension for InSpatial",
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
