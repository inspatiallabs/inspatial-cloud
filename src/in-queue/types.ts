export type ConnectionStatus =
  | "CONNECTING"
  | "OPEN"
  | "CLOSING"
  | "CLOSED"
  | "UNKNOWN";

export interface TaskInfo {
  id: string;
  systemGlobal: boolean;
  account?: string;
}
