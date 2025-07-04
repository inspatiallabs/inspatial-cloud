import type { CloudConfig } from "#types/mod.ts";
import { generateId } from "~/utils/misc.ts";
import { InCloud } from "~/cloud/in-cloud.ts";
import type { InTask } from "./entry-types/in-task/in-task.type.ts";

export class InQueue extends InCloud {
  clients: Map<string, WebSocket> = new Map();
  isRunning: boolean = false;
  constructor(appName: string, config: CloudConfig) {
    super(appName, config, "queue");
  }
  override async run() {
    await super.run();
    const port = this.getExtensionConfigValue("cloud", "queuePort");
    if (port === undefined) {
      throw new Error("Queue port is not defined in the configuration.");
    }

    this.#start(port);
  }
  broadcast(message: Record<string, any>): void {
    for (const client of this.clients.values()) {
      if (client.readyState !== WebSocket.OPEN) {
        return;
      }
      client.send(JSON.stringify(message));
    }
  }

  async checkAndRunTasks() {
    this.isRunning = true;
    const taskResults = await this.orm.getEntryList<InTask>("inTask", {
      filter: {
        status: "queued",
      },
      columns: ["id"],
    });
    for (const { id } of taskResults.rows) {
      const task = await this.orm.getEntry<InTask>("inTask", id);
      await task.runAction("runTask");
    }
    this.isRunning = false;
    setTimeout(() => {
      this.checkAndRunTasks();
    }, 10000);
  }
  startScheduler() {
    this.checkAndRunTasks();
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
      this.handleMessage(clientId, event.data);
    });
    socket.addEventListener("close", () => {
      this.clients.delete(clientId);
    });
    socket.addEventListener("error", (_error) => {
      this.clients.delete(clientId);
    });
  }
  handleMessage(_clientId: string, _data: string) {
    // Handle the message as needed
  }
}
