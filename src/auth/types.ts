export interface SessionData extends UserContext {
  email: string;
  firstName: string;
  lastName: string;
  systemAdmin: boolean;
  adminPortalAccess: boolean;
  profilePicture?: string;
  verified?: boolean;
  accounts: Array<{ accountId: string; accountName: string; role: string }>;
  [key: string]: any;
}

export interface UserContext extends UserID {
  accountId: string;
}

export interface UserID {
  userId: string;
  role: string;
}
