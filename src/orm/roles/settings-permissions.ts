import type { BasePermission } from "./shared-permissions.ts";

export interface SettingsRole<FK extends PropertyKey = PropertyKey> {
  roleName: string;
  permission: SettingsPermission<FK>;
}

export interface SettingsPermission<FK extends PropertyKey = PropertyKey>
  extends BasePermission<FK> {
}
