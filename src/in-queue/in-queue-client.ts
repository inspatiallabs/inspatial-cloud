import { getInLog } from "#inLog";
import type {
  ConnectionStatus,
  QueueCommand,
  QueueMessage,
  TaskInfo,
} from "./types.ts";

export class InQueueClient {
  #stop: boolean = false;
  #socket: WebSocket | null = null;
  onMessage: (message: QueueMessage) => void = () => {
    console.log("Default onMessage handler called");
  };
  port: number = 11354;

  constructor() {}
  init(queuePort: number) {
    this.connect(queuePort);
  }
  get closed(): boolean {
    if (!this.#socket) {
      return true;
    }

    return this.#socket.readyState === WebSocket.CLOSED;
  }
  get connected(): boolean {
    return this.#socket?.readyState === WebSocket.OPEN;
  }
  get closing(): boolean {
    return this.#socket?.readyState === WebSocket.CLOSING;
  }

  get connecting(): boolean {
    return this.#socket?.readyState === WebSocket.CONNECTING;
  }

  get connectionStatus(): ConnectionStatus {
    const status = this.#socket?.readyState;
    switch (status) {
      case WebSocket.CONNECTING:
        return "CONNECTING";
      case WebSocket.OPEN:
        return "OPEN";
      case WebSocket.CLOSING:
        return "CLOSING";
      case WebSocket.CLOSED:
        return "CLOSED";
      default:
        return "UNKNOWN";
    }
  }
  connect(queuePort: number) {
    this.port = queuePort;
    this.#reconnect();
  }
  stop() {
    this.#stop = true;
    this.#socket?.close();
  }
  async #reconnect() {
    while (this.closed) {
      if (this.connected || this.#stop) {
        break;
      }
      await this.#connect();
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  #connect() {
    this.#socket = new WebSocket(`ws://127.0.0.1:${this.port}/ws`);
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 2000);
      this.#socket!.onopen = () => {
        this.#socket!.onmessage = (event) => {
          const data = JSON.parse(event.data) as QueueMessage;

          this.onMessage(data);
        };
        this.#socket!.onclose = () => {
          this.#reconnect();
        };
        resolve();
      };
    });
  }
  onMessageReceived(callback: (message: QueueMessage) => void) {
    this.onMessage = callback;
  }
  send(queueCommand: QueueCommand) {
    if (!this.connected) {
      getInLog("cloud").debug("Queue is not connected");
      return;
    }
    this.#socket!.send(JSON.stringify(queueCommand));
  }

  addTask(taskInfo: TaskInfo) {
    this.send({
      command: "addTask",
      data: taskInfo,
    });
  }
}
