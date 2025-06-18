import { InCloud } from "@inspatial/cloud";
import { extension } from "./src/extension.ts";

export const cloud = new InCloud("myQueue", {
  extensions: [extension],
});
