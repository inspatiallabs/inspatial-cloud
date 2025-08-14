export interface SessionData extends UserContext {
  email: string;
  firstName: string;
  lastName: string;
  systemAdmin: boolean;
  profilePicture?: string;
  [key: string]: any;
}

export interface UserContext extends UserID {
  accountId: string;
}

export interface UserID {
  userId: string;
  role: string;
}
