import { generateId } from "~/utils/misc.ts";
import { IS_WINDOWS } from "../utils/path-utils.ts";
import { createInLog, type InLog } from "#inLog";

export class InLiveBroker {
  clients: Map<string, WebSocket>;
  port: number;
  server: Deno.HttpServer | undefined;
  shuttingDown: boolean = false;
  inLog: InLog;
  constructor(port: number) {
    this.port = port;
    this.clients = new Map();
    this.inLog = createInLog("inLive", {
      consoleDefaultStyle: "compact",
      name: "InLiveBroker",
    });
  }

  run() {
    this.server = Deno.serve({
      port: this.port,
      hostname: "127.0.0.1",
      onListen: (_addr) => {
        // hide stdout message
      },
    }, (request) => {
      if (this.shuttingDown) {
        return new Response("Server is shutting down", { status: 503 });
      }
      const { response, socket } = Deno.upgradeWebSocket(request);
      this.addClient(socket);
      return response;
    });
    this.setupSignals();
  }
  setupSignals() {
    Deno.addSignalListener("SIGINT", async () => {
      await this.shutdown("SIGINT");
    });
    if (IS_WINDOWS) {
      return;
    }
    Deno.addSignalListener("SIGTERM", async () => {
      await this.shutdown("SIGTERM");
    });
  }
  async shutdown(signal: string) {
    if (this.shuttingDown) {
      return;
    }
    const print = (message: string) => {
      if (signal === "SIGINT") {
        return;
      }
      this.inLog.warn(message, {
        subject: `${signal}: broker`,
        compact: true,
      });
    };
    print(`InLiveBroker is shutting down due to signal: ${signal}.`);

    this.shuttingDown = true;
    for (const socket of this.clients.values()) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    }
    this.clients.clear();
    this.server?.shutdown();
    await this.server?.finished;
    print(`InLiveBroker has shut down successfully.`);
    Deno.exit(0);
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
  handleMessage(clientId: string, data: string) {
    for (const [id, socket] of this.clients.entries()) {
      if (id === clientId) {
        continue;
      }
      socket.send(data);
    }

    // Handle the message as needed
  }
}
