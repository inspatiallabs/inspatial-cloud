import { InSpatialCloud } from "@inspatial/cloud";

const app = new InSpatialCloud("myApp", {
  builtInExtensions: {
    auth: true,
    orm: true,
  },
});
app.run();
