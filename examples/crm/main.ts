import { createInCloud } from "@inspatial/cloud";

import { product } from "./entryTypes/product.ts";
import { customerAccount } from "./entryTypes/customerAccount.ts";

createInCloud({
  name: "CRM",
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
