import { createInCloud } from "@inspatial/cloud";
import { EntryType } from "#/orm/mod.ts";

createInCloud({
  name: "My App",
  description: "My awesome app",
  entryTypes: [
    new EntryType("something", {
      defaultListFields: ["thing"],
      fields: [{
        key: "thing",
        label: "Thingd",
        type: "DataField",
      }, {
        key: "more",
        label: "More",
        type: "DataField",
      }, {
        key: "moreTwo",
        label: "More Two",
        type: "DataField",
      }],
    }),
  ],
});
