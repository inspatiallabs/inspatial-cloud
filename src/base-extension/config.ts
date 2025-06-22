export type CloudConfig = {
  mode: "production" | "development";
  logLevel: "info" | "debug" | "error" | "warn";
  logTrace: boolean;
  brokerPort: number;
  queuePort: number;
  hostName: string;
  port: number;
  autoConfig: boolean;
  allowedOrigins: Set<string>;
};
