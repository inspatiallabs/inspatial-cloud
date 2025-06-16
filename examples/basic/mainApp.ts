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
          }, {
            key: "more",
            label: "More",
            type: "DataField",
          }],
        }),
      ],
    }),
  ],
});

if (import.meta.main) {
  app.run();
  // const result = Deno.readDirSync("/");
  // for (const item of result) {
  //   console.log(item.name, item.isFile, item.isDirectory, item.isSymlink);
  // }
}
