import { generateId } from "~/utils/misc.ts";
import { IS_WINDOWS } from "../utils/path-utils.ts";
import { inLog } from "#inLog";

export class InLiveBroker {
  clients: Map<string, WebSocket>;
  port: number;
  server: Deno.HttpServer | undefined;
  shuttingDown: boolean = false;
  constructor(port: number) {
    this.port = port;
    this.clients = new Map();
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
    const subject = `${signal}: broker`;
    inLog.warn(
      `InLiveBroker is shutting down due to signal: ${signal}.`,
      {
        subject,
        compact: true,
      },
    );
    this.shuttingDown = true;
    for (const socket of this.clients.values()) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    }
    this.clients.clear();
    this.server?.shutdown();
    await this.server?.finished;
    inLog.info(`InLiveBroker has shut down successfully.`, {
      subject,
      compact: true,
    });
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
