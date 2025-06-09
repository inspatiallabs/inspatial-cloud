import { CloudExtension, InCloud } from "@inspatial/cloud";
import { EntryType } from "#/orm/mod.ts";

const app = new InCloud("myApp", {
  extensions: [
    new CloudExtension("myApp", {
      label: "My App",
      description: "My awesome app",
      entryTypes: [
        new EntryType("something", {
          fields: [{
            key: "thing",
            label: "Thingd",
            type: "DataField",
          }],
        }),
      ],
    }),
  ],
});

if (import.meta.main) {
  app.run();
}
