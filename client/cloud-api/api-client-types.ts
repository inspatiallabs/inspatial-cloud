export interface ErrorInfo {
  statusCode: number;
  message: string;
  title?: string;
}

export type ServerCall = <T>(
  group: string,
  action: string,
  data?: Record<string, any>,
  method?: RequestInit["method"],
) => Promise<T>;
