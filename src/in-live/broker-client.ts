export class BrokerClient {
  channel: string;
  #stop: boolean = false;
  #socket: WebSocket | null = null;
  #onMessage(message: { channel: string; data: Record<string, unknown> }) {
    this.#channels.get(message.channel)?.(message.data);
  }
  #channels: Map<string, (message: any) => void | Promise<void>> = new Map();
  port: number = 11254;

  constructor(channel?: string) {
    this.channel = channel ?? "default";
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
  connect(brokerPort: number) {
    this.port = brokerPort;
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
          const data = JSON.parse(event.data);

          this.#onMessage(data);
        };
        this.#socket!.onclose = () => {
          this.#reconnect();
        };
        resolve();
      };
    });
  }
  addChannel<T = Record<string, unknown>>(
    channelId: string,
    callback: (message: T) => void | Promise<void>,
  ) {
    this.#channels.set(channelId, callback);
    const send = (message: T) => {
      this.#broadcast({
        channel: channelId,
        data: message,
      });
    };
    return send;
  }

  #broadcast(message: Record<string, unknown>) {
    if (!this.connected) {
      return;
    }
    this.#socket!.send(JSON.stringify(message));
  }
}

type ConnectionStatus =
  | "CONNECTING"
  | "OPEN"
  | "CLOSING"
  | "CLOSED"
  | "UNKNOWN";
