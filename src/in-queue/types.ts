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
  account?: string;
}
interface GlobalTaskInfo extends TaskInfoBase {
  systemGlobal: true;
  account?: undefined;
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

export interface AddTaskCommand extends QueueCommandBase {
  command: "addTask";
  data: TaskInfo;
}
interface ImageTaskDataBase {
  accountId?: string;
  fileId: string;
  title: string;
  inputFilePath: string;
}
export interface OptimizeImageTaskData extends ImageTaskDataBase {
  width: number;
  height: number;
  format: "jpeg" | "png";
  withThumbnail?: boolean;
}

export interface GenerateThumbnailTaskData extends ImageTaskDataBase {
}
export interface OptimizeImageCommand extends QueueCommandBase {
  command: "optimizeImage";
  data: OptimizeImageTaskData;
}

export interface GenerateThumbnailCommand extends QueueCommandBase {
  command: "thumbnail";
  data: GenerateThumbnailTaskData;
}
export type QueueCommand =
  | AddTaskCommand
  | OptimizeImageCommand
  | GenerateThumbnailCommand;

interface QueueMessageBase {
  type: string;
  startTime?: number;
  endTime?: number;
  duration?: number;
}
type TaskStatus = "queued" | "running" | "completed" | "failed";

export interface QueueStatus extends QueueMessageBase {
  type: "status";
  status: "ready" | "running" | "paused";
}

interface QueueTaskStatusBase extends QueueMessageBase {
  type: "taskStatus";
  title: string;
  taskId: string;
  status: TaskStatus;
}
interface QueueImageOptimizeBase extends QueueMessageBase {
  type: "optimizeImage";
  title: string;
  fileId: string;
  status: TaskStatus;
}

interface QueueThumbBase extends QueueMessageBase {
  type: "thumbnail";
  title: string;
  fileId: string;
  status: TaskStatus;
}
interface QueueGlobalThumb extends QueueThumbBase {
  global: true;
}
interface QueueAccountThumb extends QueueThumbBase {
  accountId: string;
}
interface QueueGlobalImageOptimize extends QueueImageOptimizeBase {
  global: true;
  accountId?: undefined;
}

interface QueueAccountImageOptimize extends QueueImageOptimizeBase {
  accountId: string;
  global?: undefined;
}

interface QueueGlobalTaskStatus extends QueueTaskStatusBase {
  global: true;
}

interface QueueAccountTaskStatus extends QueueTaskStatusBase {
  accountId: string;
  global?: undefined;
}
export type QueueImageOptimize =
  | QueueAccountImageOptimize
  | QueueGlobalImageOptimize;
export type QueueThumb = QueueGlobalThumb | QueueAccountThumb;
export type QueueTaskStatus = QueueGlobalTaskStatus | QueueAccountTaskStatus;
export type QueueMessage =
  | QueueStatus
  | QueueGlobalTaskStatus
  | QueueAccountTaskStatus
  | QueueGlobalImageOptimize
  | QueueAccountImageOptimize
  | QueueAccountThumb
  | QueueGlobalThumb;
