import type { CloudConfig } from "#types/mod.ts";
import { generateId } from "~/utils/misc.ts";
import { InCloud } from "~/in-cloud.ts";
import type { TaskInfo } from "./types.ts";
import type { InSpatialORM } from "../orm/inspatial-orm.ts";

export class InQueue extends InCloud {
  clients: Map<string, WebSocket> = new Map();
  isRunning: boolean = false;
  queue: TaskInfo[] = [];
  globalOrm!: InSpatialORM;
  constructor(appName: string, config: CloudConfig) {
    super(appName, config, "queue");
  }
  override async run() {
    await super.run();
    this.globalOrm = this.orm.withAccount("cloud_global");
    const port = this.getExtensionConfigValue("core", "queuePort");
    if (port === undefined) {
      throw new Error("Queue port is not defined in the configuration.");
    }
    await this.loadTasks();
    this.#start(port);
  }
  addTask(task: TaskInfo) {
    this.queue.push(task);
    this.#processQueue();
  }
  async #processQueue() {
    if (this.isRunning) return;
    this.isRunning = true;
    await this.#runNextTask();
  }
  async #runNextTask() {
    const taskInfo = this.getNextTask();
    if (!taskInfo) {
      this.isRunning = false;
      return;
    }
    switch (taskInfo.systemGlobal) {
      case true:
        {
          const task = await this.globalOrm.getEntry(
            "inTaskGlobal",
            taskInfo.id,
          );
          await task.runAction("runTask");
        }
        break;
      default: {
        // if (!taskInfo.account) {
        //   raiseCloudException(`task ${taskInfo.id} has no account`);
        // }
        // const orm = this.orm.withAccount(taskInfo.account);
        // const task = await orm.getEntry("inTask", taskInfo.id);
        // await task.runAction("runTask");
      }
    }
    await this.#runNextTask();
  }
  getNextTask(): TaskInfo | undefined {
    return this.queue.shift();
  }
  broadcast(message: Record<string, any>): void {
    for (const client of this.clients.values()) {
      if (client.readyState !== WebSocket.OPEN) {
        return;
      }
      client.send(JSON.stringify(message));
    }
  }
  async loadTasks() {
    // load global tasks
    const { rows: globalTasks } = await this.globalOrm.getEntryList(
      "inTaskGlobal",
      {
        columns: ["id"],
        filter: [{
          field: "status",
          op: "=",
          value: "queued",
        }],
        limit: 0,
      },
    );
    for (const task of globalTasks) {
      this.queue.push({
        id: task.id as string,
        systemGlobal: true,
        account: "cloud_global",
      });
    }
    return; // skip loading account tasks for now
    // load account tasks
    // const { rows: accounts } = await this.orm.getEntryList("account", {
    //   columns: ["id"],
    //   filter: [{
    //     field: "initialized",
    //     op: "=",
    //     value: true,
    //   }],
    //   limit: 0,
    // });

    // for (const account of accounts) {
    //   const orm = this.orm.withAccount(account.id as string);

    //   const { rows: accountTasks } = await orm.getEntryList("inTask", {
    //     columns: ["id"],
    //     filter: [{
    //       field: "status",
    //       op: "=",
    //       value: "queued",
    //     }],
    //     limit: 0,
    //   });
    //   for (const task of accountTasks) {
    //     this.queue.push({
    //       id: task.id as string,
    //       systemGlobal: false,
    //       account: account.id as string,
    //     });
    //   }
    // }
  }
  startScheduler() {
    // this.checkAndRunTasks();
    this.#processQueue();
  }
  #start(port: number) {
    Deno.serve({
      port: port,
      hostname: "127.0.0.1",
      onListen: (_addr) => {
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
        const data = JSON.parse(event.data);
        this.handleMessage(clientId, data);
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
  handleMessage(_clientId: string, task: TaskInfo) {
    this.addTask(task);
  }
}
