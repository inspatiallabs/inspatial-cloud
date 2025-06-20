import { generateId } from "#utils/misc.ts";

export class InCloudBroker {
  clients: Map<string, WebSocket>;
  port: number;
  constructor(port: number) {
    this.port = port;
    this.clients = new Map();
  }

  run() {
    Deno.serve({
      port: this.port,
      hostname: "127.0.0.1",
      onListen: (addr) => {
      },
    }, async (request) => {
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
    socket.addEventListener("error", (error) => {
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
