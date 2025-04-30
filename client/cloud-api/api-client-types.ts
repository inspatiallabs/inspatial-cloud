export interface ErrorInfo {
  statusCode: number;
  message: string;
  title?: string;
}

export type ServerCall = <T>(
  group: string,
  action: string,
  data?: Record<string, unknown>,
  method?: RequestInit["method"],
) => Promise<T>;

export interface NotificationInfo {
  title: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
}
