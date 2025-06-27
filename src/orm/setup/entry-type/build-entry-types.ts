import type { EntryType } from "~/orm/entry/entry-type.ts";
import { buildConnectionFields } from "~/orm/setup/setup-utils.ts";
import type { Role } from "../../roles/role.ts";

export function buildEntryType(
  role: Role,
  entryType: EntryType,
): void {
  buildConnectionFields(role, entryType);
  if (!entryType.children) {
    return;
  }
  for (const child of entryType.children.values()) {
    buildConnectionFields(role, child);
  }
}
