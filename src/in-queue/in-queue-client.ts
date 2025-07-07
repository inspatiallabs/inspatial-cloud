import { inLog } from "#inLog";
import type { ConnectionStatus, TaskInfo } from "./types.ts";

export class InQueueClient {
  #stop: boolean = false;
  #socket: WebSocket | null = null;
  onMessage: (message: Record<string, unknown>) => void = () => {
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
          const data = JSON.parse(event.data) as Record<string, unknown>;

          this.onMessage(data);
        };
        this.#socket!.onclose = () => {
          this.#reconnect();
        };
        resolve();
      };
    });
  }
  onMessageReceived(callback: (message: Record<string, unknown>) => void) {
    this.onMessage = callback;
  }
  send(message: TaskInfo) {
    if (!this.connected) {
      inLog.warn("Queue is not connected");
      return;
    }
    this.#socket!.send(JSON.stringify(message));
  }
}
