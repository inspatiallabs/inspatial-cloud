import { createInCloud } from "@inspatial/cloud";
import { EntryType } from "/orm/mod.ts";

createInCloud({
  name: "myAwesomeCloud",
  entryTypes: [
    new EntryType("thing", {
      fields: [],
      actions: [{
        key: "yo",
        params: [],
        action() {
          console.log("Hello from the cloud!");
        },
      }],
    }),
  ],
});
