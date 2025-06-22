export type CloudConfig = {
  mode: string;
  logLevel: string;
  logTrace: boolean;
  brokerPort: number;
  queuePort: number;
  hostName: string;
  port: number;
  autoConfig: boolean;
  allowedOrigins: Set<string>;
};
