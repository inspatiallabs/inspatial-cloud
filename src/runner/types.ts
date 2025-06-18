export type CloudRunnerMode =
  | "manager"
  | "server"
  | "migrator"
  | "broker"
  | "queue"
  | "db";
export type RunnerMode = Exclude<CloudRunnerMode, "manager">;
