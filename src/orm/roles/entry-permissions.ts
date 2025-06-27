import type { BasePermission } from "./shared-permissions.ts";

export interface EntryRole<FK extends PropertyKey = PropertyKey> {
  roleName: string;
  permission: EntryPermission<FK>;
}

export interface EntryPermission<FK extends PropertyKey = PropertyKey>
  extends BasePermission<FK> {
  create: boolean;
  delete: boolean;
  userScoped?: {
    userIdField: string;
  };
}
