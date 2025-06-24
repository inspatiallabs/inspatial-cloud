import type { EntryType } from "/orm/entry/entry-type.ts";
import { validateConnectionFields } from "/orm/setup/setup-utils.ts";
import type { Role } from "../../roles/role.ts";

export function validateEntryType(
  role: Role,
  entryType: EntryType,
): void {
  validateConnectionFields(role, entryType);
}
