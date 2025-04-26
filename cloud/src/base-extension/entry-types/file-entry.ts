import { EntryType } from "@inspatial/cloud";

const fileEntry = new EntryType("file", {
  fields: [{
    key: "fileName",
    label: "File Name",
    type: "DataField",
    required: true,
  }],
});
