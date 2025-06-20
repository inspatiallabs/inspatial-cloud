import { createInCloud } from "@inspatial/cloud";
import customerAccount from "./entryTypes/customerAccount.ts";

createInCloud({
  name: "CRM",
  description: "Customer Relationship Management",
  version: "1.0.0",
  entryTypes: [customerAccount],
});
