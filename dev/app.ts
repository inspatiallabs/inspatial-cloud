import { InSpatialCloud } from "#/inspatial-cloud.ts";

const app = new InSpatialCloud("myApp", {
  builtInExtensions: {
    auth: true,
    orm: true,
  },
});
app.run();
