export interface BasePermission<FK extends PropertyKey = PropertyKey> {
  view: boolean;
  modify: boolean;
  fields?: FieldPermissions<FK>;
  actions?: ActionsPermissions;
}

type FieldPermissions<FK extends PropertyKey = PropertyKey> = {
  [K in FK]?: FieldPermission;
};

interface FieldPermission {
  view: boolean;
  modify: boolean;
}

interface ActionsPermissions {
  [key: string]: ActionPermission;
}

type ActionPermission = "allowed" | "denied";
