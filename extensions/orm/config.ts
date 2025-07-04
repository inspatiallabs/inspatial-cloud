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
