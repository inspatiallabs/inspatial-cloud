export interface SessionData {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  systemAdmin: boolean;
  role: string;
  [key: string]: any;
}
