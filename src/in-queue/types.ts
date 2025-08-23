export type ConnectionStatus =
  | "CONNECTING"
  | "OPEN"
  | "CLOSING"
  | "CLOSED"
  | "UNKNOWN";

interface TaskInfoBase {
  id: string;
  title: string;
  systemGlobal?: true;
}
interface GlobalTaskInfo extends TaskInfoBase {
  systemGlobal: true;
}
interface AccountTaskInfo extends TaskInfoBase {
  account: string;
  systemGlobal?: undefined;
}
export type TaskInfo = GlobalTaskInfo | AccountTaskInfo;

interface QueueCommandBase {
  command: string;
  data?: object;
}

interface AddTaskCommand extends QueueCommandBase {
  command: "addTask";
  data: TaskInfo;
}

export type QueueCommand = AddTaskCommand;

interface QueueMessageBase {
  type: string;
}

export interface QueueStatus extends QueueMessageBase {
  type: "status";
  status: "ready" | "running" | "paused";
}

interface QueueTaskStatusBase extends QueueMessageBase {
  type: "taskStatus";
  title: string;
  startTime?: number;
  endTime?: number;
  duration?: number;
  taskId: string;
  status: "queued" | "running" | "completed" | "failed";
}

interface QueueGlobalTaskStatus extends QueueTaskStatusBase {
  global: true;
}

interface QueueAccountTaskStatus extends QueueTaskStatusBase {
  accountId: string;
  global?: undefined;
}

export type QueueTaskStatus = QueueGlobalTaskStatus | QueueAccountTaskStatus;
export type QueueMessage =
  | QueueStatus
  | QueueGlobalTaskStatus
  | QueueAccountTaskStatus;
