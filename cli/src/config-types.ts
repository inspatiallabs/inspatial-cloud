export type ORMConfig = {
  autoTypes: boolean;
  autoMigrate: boolean;
  embeddedDb: boolean;
  embeddedDbPort: number;
  ormDebugMode: boolean;
  dbConnectionType: "tcp" | "socket";
  dbSocketPath: string;
  dbName: string;
  dbHost: string;
  dbPort: number;
  dbUser: string;
  dbPassword: string;
  dbAppName: string;
  dbClientMode: "pool" | "single";
  dbPoolSize: number;
  dbMaxPoolSize: number;
  dbIdleTimeout: number;
};
export type AuthConfig = {
  allowAll: boolean;
};

export type CloudConfig = {
  name: string;
  cloudMode: "production" | "development";
  logLevel: "info" | "debug" | "error" | "warn";
  logTrace: boolean;
  brokerPort: number;
  queuePort: number;
  hostName: string;
  port: number;
  autoConfig: boolean;
  allowedOrigins: Set<string>;
  publicRoot: string;
  singlePageApp: boolean;
  cacheStatic: boolean;
};

export interface BuiltInConfig {
  cloud: CloudConfig;
  orm: ORMConfig;
  auth: AuthConfig;
}
