import { CloudExtension } from "@inspatial/cloud";
import customerAccount from "./entryTypes/customerAccount.ts";

const crmExtension = new CloudExtension("crm", {
  label: "CRM",
  description: "Customer Relationship Management",
  version: "1.0.0",
  entryTypes: [customerAccount],
});

export default crmExtension;
