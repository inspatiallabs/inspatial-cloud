import { CloudExtension } from "@inspatial/cloud";

import { product } from "./entryTypes/product.ts";
import { customerAccount } from "./entryTypes/customerAccount.ts";

const crmExtension = new CloudExtension("crm", {
  label: "CRM",
  description: "Customer Relationship Management",
  version: "1.0.0",
  entryTypes: [customerAccount, product],
  roles: [{
    roleName: "customer",
    description: "A customer",
    label: "Customer",
  }, {
    roleName: "manager",
    description: "A manager",
    label: "Manager",
  }],
});

export default crmExtension;
