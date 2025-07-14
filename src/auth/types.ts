export interface SessionData {
  email: string;
  firstName: string;
  lastName: string;
  systemAdmin: boolean;
  accountId: string | null;
  role: string | null;
  userId: string;
  [key: string]: any;
}

export interface UserContext extends UserID {
  accountId: string;
}

export interface UserID {
  userId: string;
  role: string;
}
