import { InCloud } from "@inspatial/cloud";
import crmExtension from "./crmExtension.ts";

const app = new InCloud("myCRM", {
  extensions: [crmExtension],
});
app.run();
