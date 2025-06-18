import { CloudExtension } from "@inspatial/cloud";
import { sample } from "./entry-types/sample-entry.ts";

export const extension = new CloudExtension("myTasks", {
  label: "My Tasks",
  description: "A simple task queue for InSpatial",
  entryTypes: [sample],
});
