import { EntryType } from "@inspatial/cloud";
import type { Product } from "../.inspatial/_generated/entries/product.ts";

export const product = new EntryType<Product>("product", {
  fields: [],
  roles: [],
});
