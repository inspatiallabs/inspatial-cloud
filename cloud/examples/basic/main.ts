import { InCloud } from "@inspatial/cloud";

const app = new InCloud("myApp", {
  extensions: [],
});

if (import.meta.main) {
  app.run();
}
