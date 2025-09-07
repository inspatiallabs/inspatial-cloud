import type { CloudConfig } from "#types/mod.ts";
import { generateId } from "~/utils/misc.ts";
import { InCloud } from "~/in-cloud.ts";
import type {
  AddTaskCommand,
  GenerateThumbnailCommand,
  GenerateThumbnailTaskData,
  OptimizeImageCommand,
  OptimizeImageTaskData,
  QueueCommand,
  QueueMessage,
  TaskInfo,
} from "./types.ts";
import type { InSpatialORM } from "../orm/inspatial-orm.ts";
import { dateUtils } from "~/utils/date-utils.ts";
import { createInLog } from "#inLog";
import { ImageOps } from "../files/image-ops/image-ops.ts";
import MimeTypes from "../files/mime-types/mime-types.ts";
import type { ListOptions } from "../orm/db/db-types.ts";
import type { CloudFile, EntryMap, GlobalCloudFile } from "#types/models.ts";

export class InQueue extends InCloud {
  clients: Map<string, WebSocket> = new Map();
  isRunning: boolean = false;
  queue: Array<QueueCommand> = [];
  globalOrm!: InSpatialORM;
  ready: Promise<void> = Promise.resolve();
  maxConcurrentTasks: number = 3;
  makeReady: () => void = () => {};
  taskQueueReady: Promise<void> = Promise.resolve();
  makeTaskQueueReady: () => void = () => {};
  runningTaskCount: number = 0;
  images: ImageOps;
  constructor(appName: string, config: CloudConfig) {
    super(appName, config, "queue");
    this.inLog = createInLog("in-queue", {
      consoleDefaultStyle: "compact",
      name: "in-queue",
      traceOffset: 1,
    });
    this.images = new ImageOps();
  }
  override async run() {
    this.init();
    await this.boot();
    const { brokerPort } = this.getExtensionConfig(
      "core",
    );
    this.images.init();
    this.inChannel.connect(brokerPort);
    this.inLive.init();
    this.globalOrm = this.orm.withAccount("cloud_global");
    const port = this.getExtensionConfigValue("core", "queuePort");
    if (port === undefined) {
      throw new Error("Queue port is not defined in the configuration.");
    }
    this.#start(port);
  }
  addTask(taskCommand: AddTaskCommand) {
    this.queue.push(taskCommand);
    const task = taskCommand.data;
    this.broadcastQueued("taskStatus", {
      title: task.title,
      taskId: task.id,
      time: dateUtils.nowTimestamp(),
    }, task.account);
    if (this.isRunning) {
      this.#runNextTask();
      return;
    }
    this.#processQueue();
  }
  addImageTask(taskCommand: OptimizeImageCommand) {
    this.queue.push(taskCommand);
    const task = taskCommand.data;
    this.broadcastQueued("optimizeImage", {
      title: task.title,
      fileId: task.fileId,
    }, task.accountId);

    if (this.isRunning) {
      this.#runNextTask();
      return;
    }
    this.#processQueue();
  }
  addThumbTask(taskCommand: GenerateThumbnailCommand) {
    this.queue.push(taskCommand);
    const task = taskCommand.data;
    this.broadcastQueued("thumbnail", {
      title: task.title,
      fileId: task.fileId,
    }, task.accountId);
    if (this.isRunning) {
      this.#runNextTask();
      return;
    }
    this.#processQueue();
  }
  async #processQueue() {
    if (this.isRunning) {
      this.inLog.debug("Queue is already running, skipping processQueue call.");
      return;
    }
    this.broadcast({ type: "status", status: "running" });
    this.isRunning = true;
    this.ready = new Promise((resolve) => {
      this.makeReady = () => {
        resolve();
      };
    });
    this.#runNextTask();
    await this.ready;
    this.isRunning = false;
    this.broadcast({ type: "status", status: "ready" });
  }
  async #runNextTask() {
    if (this.runningTaskCount >= this.maxConcurrentTasks) {
      this.taskQueueReady = new Promise((resolve) => {
        this.makeTaskQueueReady = () => {
          resolve();
        };
      });
      await this.taskQueueReady;
    }
    const queueCommand = this.getNextTask();

    if (!queueCommand) {
      return;
    }

    this.#runNextTask();
    const handleError = (e: unknown) => {
      console.log("failed", e);
      if (Error.isError(e)) {
        this.inLog.error(e, {
          stackTrace: e.stack,
        });
      }
    };
    switch (queueCommand.command) {
      case "optimizeImage":
        await this.runOptimizeTask(queueCommand.data).catch(handleError);
        break;
      case "addTask":
        await this.runInTask(queueCommand.data).catch(handleError);
        break;
      case "thumbnail":
        await this.runThumbTask(queueCommand.data).catch(handleError);
        break;
    }

    this.runningTaskCount--;

    if (this.runningTaskCount === 0 && this.queue.length === 0) {
      this.makeReady();
    }
    if (this.runningTaskCount < this.maxConcurrentTasks) {
      this.makeTaskQueueReady();
    }
  }
  async getFile(
    fileId: string,
    accountId?: string,
  ): Promise<CloudFile | GlobalCloudFile> {
    if (!accountId) {
      return await this.globalOrm.getEntry("globalCloudFile", fileId);
    }
    return await this.orm.withAccount(accountId!).getEntry("cloudFile", fileId);
  }
  async runThumbTask(taskInfo: GenerateThumbnailTaskData) {
    const { fileId, inputFilePath, title, accountId } = taskInfo;
    const message = this.buildMessage({
      type: "thumbnail",
      title,
      fileId,
    }, accountId);
    const fileEntry = await this.getFile(fileId, accountId);

    const startTime = this.broadcastStart(message);
    const result = await this.images.generateThumbnail({
      command: "thumbnail",
      filePath: inputFilePath,
      size: 200,
    });
    if (result.success) {
      fileEntry.$thumbnailSize = result.fileSize;
      fileEntry.$hasThumbnail = true;
      fileEntry.$thumbnailPath = result.outputFilePath;
      await fileEntry.save();
      this.broadcastEnd("completed", startTime, message);
      return;
    }

    this.broadcastEnd("failed", startTime, message);
  }

  async runOptimizeTask(taskInfo: OptimizeImageTaskData) {
    const {
      format,
      height,
      inputFilePath,
      width,
      title,
      withThumbnail,
      accountId,
      fileId,
    } = taskInfo;
    const message = this.buildMessage({
      type: "optimizeImage",
      fileId,
      title,
    }, accountId);
    const fileEntry = await this.getFile(fileId, accountId);

    const startTime = this.broadcastStart(message);
    const result = await this.images.optimizeImage({
      command: "optimize",
      withThumbnail,
      filePath: inputFilePath,
      height,
      width,
      format,
    });

    if (result.success) {
      fileEntry.$filePath = result.newFilePath;
      if (result.thumbnailSize) {
        fileEntry.$thumbnailSize = result.thumbnailSize;
      }
      if (result.thumbnailPath) {
        fileEntry.$thumbnailPath = result.thumbnailPath;
      }
      fileEntry.$fileSize = result.fileSize;
      fileEntry.$fileExtension = format;
      fileEntry.$optimized = true;
      fileEntry.$mimeType = MimeTypes.getMimeTypeByExtension(format);
      await fileEntry.save();
      this.broadcastEnd("completed", startTime, message);
      return;
    }
    this.inLog.error(result, {
      subject: "Image optimization failed",
    });
    this.broadcastEnd("failed", startTime, message);
  }
  async runInTask(taskInfo: TaskInfo) {
    const message = this.buildMessage({
      type: "taskStatus",
      taskId: taskInfo.id,
      title: taskInfo.title,
    }, taskInfo.account);
    const startTime = this.broadcastStart(message);
    let task;
    if (taskInfo.systemGlobal) {
      task = await this.globalOrm.getEntry(
        "inTaskGlobal",
        taskInfo.id,
      );
    } else {
      task = await this.orm.withAccount(taskInfo.account).getEntry(
        "inTask",
        taskInfo.id,
      );
    }
    await task.runAction("runTask");
    this.broadcastEnd("completed", startTime, message);
  }
  getNextTask(): QueueCommand | undefined {
    const task = this.queue.shift();
    if (task) {
      this.runningTaskCount++;
    }
    return task;
  }
  buildMessage(input: Record<string, any>, accountId?: string) {
    if (accountId) {
      return {
        ...input,
        accountId,
      };
    }
    return {
      ...input,
      global: true,
    };
  }
  broadcastQueued(
    type: QueueMessage["type"],
    message: Record<string, any>,
    accountId?: string,
  ) {
    message.type = type;
    message.status = "queued";
    if (accountId) {
      message.accountId = accountId;
    } else {
      message.global = true;
    }

    this.broadcast(message as any);
  }
  broadcastStart(message: Record<string, any>): number {
    const startTime = dateUtils.nowTimestamp();
    message.startTime = startTime;
    message.status = "running";
    return startTime;
  }
  broadcastEnd(
    status: "failed" | "completed",
    startTime: number,
    message: Record<string, any>,
  ) {
    message.startTime = startTime;
    const endTime = dateUtils.nowTimestamp();
    message.status = status;
    message.endTime = endTime;
    message.duration = endTime - message.startTime;
    this.broadcast(message as any);
  }
  broadcast(message: QueueMessage): void {
    for (const client of this.clients.values()) {
      if (client.readyState !== WebSocket.OPEN) {
        return;
      }
      client.send(JSON.stringify(message));
    }
  }

  async loadTasks() {
    // load global tasks
    const listOptions: ListOptions = {
      columns: ["id"],
      filter: [{
        field: "status",
        op: "=",
        value: "queued",
      }],
      limit: 0,
    };
    const { rows: globalTasks } = await this.globalOrm.getEntryList(
      "inTaskGlobal",
      listOptions,
    );
    for (const task of globalTasks) {
      this.queue.push({
        command: "addTask",
        data: {
          id: task.id as string,
          systemGlobal: true,
          title: task.title,
        },
      });
    }
    const optimizeOptions: ListOptions = {
      columns: [
        "id",
        "filePath",
        "fileName",
        "optimizeFormat",
        "optimizeHeight",
        "optimizeWidth",
        "hasThumbnail",
      ],
      filter: {
        fileType: "image",
        optimizeImage: true,
        optimized: false,
      },
    };

    const { rows: globalOptimizeFiles } = await this.globalOrm.getEntryList(
      "globalCloudFile",
      optimizeOptions,
    );
    for (const file of globalOptimizeFiles) {
      this.queue.push({
        command: "optimizeImage",
        data: {
          fileId: file.id as string,
          format: file.optimizeFormat || "jpeg",
          height: file.optimizeHeight || 1000,
          withThumbnail: !file.hasThumbnail,
          width: file.optimizeWidth || 1000,
          inputFilePath: file.filePath,
          title: file.fileName,
        },
      });
    }

    // load account tasks

    const { rows: accounts } = await this.orm.getEntryList("account", {
      columns: ["id"],
      filter: [{
        field: "initialized",
        op: "=",
        value: true,
      }],
      limit: 0,
    });

    for (const account of accounts) {
      const orm = this.orm.withAccount(account.id as string);

      const { rows: accountTasks } = await orm.getEntryList(
        "inTask",
        listOptions,
      );

      for (const task of accountTasks) {
        this.queue.push({
          command: "addTask",
          data: {
            id: task.id as string,
            title: task.title,
            account: account.id as string,
          },
        });
      }

      const { rows: optimizeFiles } = await orm.getEntryList(
        "cloudFile",
        optimizeOptions,
      );
      for (const file of optimizeFiles) {
        this.queue.push({
          command: "optimizeImage",
          data: {
            fileId: file.id as string,
            format: file.optimizeFormat || "jpeg",
            height: file.optimizeHeight || 1000,
            width: file.optimizeWidth || 1000,
            inputFilePath: file.filePath,
            title: file.fileName,
            withThumbnail: !file.hasThumbnail,
            accountId: account.id as string,
          },
        });
      }
    }
  }
  async cancelRunningTasks() {
    const listOptions = {
      columns: ["id"],
      filter: [{
        field: "status",
        op: "=",
        value: "running",
      }],
      limit: 0,
    } as ListOptions;
    const cancelTask = async (
      task: EntryMap["inTask"] | EntryMap["inTaskGlobal"],
    ) => {
      task.$status = "failed";
      task.$endTime = dateUtils.nowTimestamp();
      task.$errorInfo = "Task was cancelled due to server restart.";
      await task.save();
    };
    const { rows: globalTasks } = await this.globalOrm.getEntryList(
      "inTaskGlobal",
      listOptions,
    );
    for (const task of globalTasks) {
      const taskEntry = await this.globalOrm.getEntry(
        "inTaskGlobal",
        task.id,
      );
      await cancelTask(taskEntry);
    }

    const { rows: accounts } = await this.orm.getEntryList("account", {
      columns: ["id"],
      filter: [{
        field: "initialized",
        op: "=",
        value: true,
      }],
      limit: 0,
    });

    for (const account of accounts) {
      const orm = this.orm.withAccount(account.id as string);
      const { rows: accountTasks } = await orm.getEntryList(
        "inTask",
        listOptions,
      );
      for (const task of accountTasks) {
        const taskEntry = await orm.getEntry(
          "inTask",
          task.id,
        );
        await cancelTask(taskEntry);
      }
    }
  }
  async startScheduler() {
    await this.cancelRunningTasks();
    await this.loadAndRunTasks();
    setInterval(() => {
      this.inLog.debug("Scheduler tick - checking for new tasks");
      this.loadAndRunTasks();
    }, 30000);
  }

  async loadAndRunTasks() {
    if (this.isRunning) {
      return;
    }

    await this.loadTasks();
    this.#processQueue();
  }
  #start(port: number) {
    Deno.serve({
      port: port,
      hostname: "127.0.0.1",
      onListen: (_addr) => {
        this.inLog.debug(`Queue is running on open port ${port}`);
        this.startScheduler();
      },
    }, (request) => {
      const { response, socket } = Deno.upgradeWebSocket(request);
      this.addClient(socket);
      return response;
    });
  }
  addClient(socket: WebSocket) {
    const clientId = generateId();
    socket.addEventListener("open", () => {
      this.clients.set(clientId, socket);
    });
    socket.addEventListener("message", (event) => {
      try {
        const eventData = JSON.parse(event.data);
        this.handleMessage(clientId, eventData);
      } catch (error) {
        this.inLog.error(error);
      }
    });
    socket.addEventListener("close", () => {
      this.clients.delete(clientId);
    });
    socket.addEventListener("error", (_error) => {
      this.clients.delete(clientId);
    });
  }
  handleMessage(_clientId: string, eventData: QueueCommand) {
    const { command, data } = eventData;
    switch (command) {
      case "addTask":
        this.addTask(eventData);
        break;
      case "optimizeImage":
        this.addImageTask(eventData);
        break;
      case "thumbnail":
        this.addThumbTask(eventData);
        break;
    }
  }
}
