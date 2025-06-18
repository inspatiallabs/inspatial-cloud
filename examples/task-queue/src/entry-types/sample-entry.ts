import { EntryType } from "@inspatial/cloud";

export const sample = new EntryType("sample", {
  label: "Sample Entry",
  description: "A sample entry type for demonstration purposes",
  fields: [],
});

sample.addAction({
  key: "sampleAction",
  params: [{
    key: "message",
    label: "Message",
    type: "DataField",
    required: true,
  }],
  action({ data }) {
    console.log("Sample action executed with message:", data.message);
    return {
      success: true,
      message: `Action executed with message: ${data.message}`,
    };
  },
});
