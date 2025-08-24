import type { CloudConfig } from "#types/mod.ts";
import { generateId } from "~/utils/misc.ts";
import { InCloud } from "~/in-cloud.ts";
import type { QueueCommand, QueueMessage, TaskInfo } from "./types.ts";
import type { InSpatialORM } from "../orm/inspatial-orm.ts";
import { dateUtils } from "~/utils/date-utils.ts";
import { createInLog } from "#inLog";
import type { InTaskGlobal } from "./entry-types/in-task/_in-task-global.type.ts";
import type { GenericEntry } from "../orm/entry/entry-base.ts";

export class InQueue extends InCloud {
  clients: Map<string, WebSocket> = new Map();
  isRunning: boolean = false;
  queue: TaskInfo[] = [];
  globalOrm!: InSpatialORM;
  ready: Promise<void> = Promise.resolve();
  maxConcurrentTasks: number = 3;
  makeReady: () => void = () => {};
  taskQueueReady: Promise<void> = Promise.resolve();
  makeTaskQueueReady: () => void = () => {};
  runningTaskCount: number = 0;
  constructor(appName: string, config: CloudConfig) {
    super(appName, config, "queue");
    this.inLog = createInLog("in-queue", {
      consoleDefaultStyle: "compact",
      name: "in-queue",
      traceOffset: 1,
    });
  }
  override async run() {
    this.init();
    await this.boot();
    const { brokerPort } = this.getExtensionConfig(
      "core",
    );
    this.inLive.init(brokerPort);
    this.inCache.init(brokerPort);
    this.globalOrm = this.orm.withAccount("cloud_global");
    const port = this.getExtensionConfigValue("core", "queuePort");
    if (port === undefined) {
      throw new Error("Queue port is not defined in the configuration.");
    }
    this.#start(port);
  }
  addTask(task: TaskInfo) {
    this.queue.push(task);
    const message = {
      type: "taskStatus",
      status: "queued",
      title: task.title,
      taskId: task.id,
      time: dateUtils.nowTimestamp(),
    } as const;
    if (task.systemGlobal) {
      this.broadcast(
        { ...message, global: true },
      );
    } else {
      this.broadcast(
        { ...message, accountId: task.account },
      );
    }
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
        console.log("making ready!");
        resolve();
      };
    });
    this.#runNextTask();
    await this.ready;
    this.isRunning = false;
    this.broadcast({ type: "status", status: "ready" });
  }
  async #runNextTask() {
    this.inLog.debug(
      `Running next task. ${this.queue.length} tasks remaining.`,
    );
    if (this.runningTaskCount >= this.maxConcurrentTasks) {
      this.inLog.debug(
        `Maximum concurrent tasks reached (${this.runningTaskCount}). Waiting...`,
      );
      this.taskQueueReady = new Promise((resolve) => {
        this.makeTaskQueueReady = () => {
          console.log("making task queue ready!");
          resolve();
        };
      });
      await this.taskQueueReady;
      this.inLog.debug(
        `Resuming task processing. ${this.runningTaskCount} tasks still running.`,
      );
    }
    const taskInfo = this.getNextTask();

    if (!taskInfo) {
      return;
    }
    this.#runNextTask();
    const tastEntryType = taskInfo.systemGlobal
      ? "inTaskGlobal"
      : "inTask" as const;
    switch (tastEntryType) {
      case "inTaskGlobal": {
        const task = await this.globalOrm.getEntry<InTaskGlobal>(
          "inTaskGlobal",
          taskInfo.id,
        );
        const startTime = dateUtils.nowTimestamp();
        const message = {
          type: "taskStatus",
          status: "running",
          startTime,
          taskId: taskInfo.id,
          global: true,
          title: task.title,
        } as const;
        this.broadcast(message);
        await task.runAction("runTask");
        const endTime = dateUtils.nowTimestamp();
        const duration = endTime - startTime;
        this.broadcast({
          ...message,
          status: "completed",
          endTime,
          duration,
        });
        break;
      }
      case "inTask": {
        if (taskInfo.systemGlobal) {
          break;
        }

        const orm = this.orm.withAccount(taskInfo.account);
        const task = await orm.getEntry("inTask", taskInfo.id);
        const startTime = dateUtils.nowTimestamp();
        const message = {
          type: "taskStatus",
          status: "running",
          startTime,
          taskId: taskInfo.id,
          accountId: taskInfo.account,
          title: task.title,
        } as const;
        this.broadcast(message);
        await task.runAction("runTask");
        const endTime = dateUtils.nowTimestamp();
        const duration = endTime - startTime;
        this.broadcast({
          ...message,
          status: "completed",
          endTime,
          duration,
        });
        break;
      }
    }
    this.inLog.debug(`Task ${taskInfo.id} completed.`);
    this.inLog.debug(`${this.runningTaskCount} tasks still running.`);
    this.runningTaskCount--;
    this.inLog.debug(`${this.runningTaskCount} tasks still running.`);
    if (this.runningTaskCount === 0 && this.queue.length === 0) {
      this.makeReady();
    }
    if (this.runningTaskCount < this.maxConcurrentTasks) {
      this.makeTaskQueueReady();
    }
  }
  getNextTask(): TaskInfo | undefined {
    const task = this.queue.shift();
    if (task) {
      this.runningTaskCount++;
    }
    return task;
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
    const listOptions = {
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
        id: task.id as string,
        systemGlobal: true,
        title: task.title,
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
          id: task.id as string,
          title: task.title,
          account: account.id as string,
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
    };
    const cancelTask = async (task: GenericEntry) => {
      task.status = "failed";
      task.endTime = dateUtils.nowTimestamp();
      task.errorInfo = "Task was cancelled due to server restart.";
      await task.save();
    };
    const { rows: globalTasks } = await this.globalOrm.getEntryList(
      "inTaskGlobal",
      listOptions,
    );
    for (const task of globalTasks) {
      const taskEntry = await this.globalOrm.getEntry<InTaskGlobal>(
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
        this.addTask(data);
    }
  }
}
