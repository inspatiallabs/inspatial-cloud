export interface EntryRole {
  roleName: string;
  permissions: EntryPermissions;
}

export interface EntryPermissions {
  view: boolean;
  create: boolean;
  modify: boolean;
  delete: boolean;
  fieldPermissions?: FieldPermissions;
}

type FieldPermissions<FK extends PropertyKey = string> = {
  [K in FK]?: FieldPermission;
};

interface FieldPermission {
  view: boolean;
  modify: boolean;
}
