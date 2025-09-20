import type { BasePermission } from "~/orm/roles/shared-permissions.ts";

export interface EntryRole<FK extends PropertyKey = PropertyKey> {
  roleName: string;
  permission: EntryPermission<FK>;
}

export interface EntryPermission<FK extends PropertyKey = PropertyKey>
  extends BasePermission<FK> {
  create: boolean;
  delete: boolean;
  /** Only allow access to entries where this field = the user id */
  userScope?: string;
}
