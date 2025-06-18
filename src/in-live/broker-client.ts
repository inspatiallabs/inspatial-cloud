export class BrokerClient<T> {
  channel: string;
  #stop: boolean = false;
  #socket: WebSocket | null = null;
  onMessage: (message: T) => void = () => {
    console.log("Default onMessage handler called");
  };
  port: number = 11254;

  constructor(channel: string, port: number = 11254) {
    this.channel = channel;
    this.port = port;
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
  connect() {
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
  async #connect() {
    this.#socket = new WebSocket(`ws://127.0.0.1:${this.port}/ws`);
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        resolve();
      }, 2000);
      this.#socket!.onopen = () => {
        this.#socket!.onmessage = (event) => {
          const data = JSON.parse(event.data) as T;

          this.onMessage(data);
        };
        this.#socket!.onclose = () => {
          this.#reconnect();
        };
        resolve();
      };
    });
  }
  onMessageReceived(callback: (message: T) => void) {
    this.onMessage = callback;
  }
  broadcast(message: T) {
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
