type SocketStatus = "connecting" | "open" | "closed" | "error" | "reconnected";
export class InQueueClient {
  #socket!: WebSocket;
  #isReconnect: boolean = false;
  port: number;
  #messageListeners: Set<
    (room: string, event: string, data: Record<string, unknown>) => void
  > = new Set();
  #statusListeners: Set<(status: SocketStatus) => void> = new Set();
  #manualClose = false;

  /**
   * Whether the client is connected to the server.
   */
  get connected(): boolean {
    return this.#socket?.readyState === WebSocket.OPEN;
  }

  /**
   * Whether the client is connecting to the server.
   */
  get connecting(): boolean {
    return this.#socket?.readyState === WebSocket.CONNECTING;
  }

  /**
   * Whether the client is disconnected from the server.
   */
  get closed(): boolean {
    return this.#socket?.readyState === WebSocket.CLOSED;
  }

  constructor(port?: number) {
    this.port = port || 8080;
  }

  /**
   * Add a listener for messages from the server.
   */
  onMessage(
    callback: (
      room: string,
      event: string,
      data: Record<string, unknown>,
    ) => void,
  ): void {
    this.#messageListeners.add(callback);
  }

  /**
   * Remove a listener for messages from the server.
   */
  removeMessageListener(
    callback: (
      room: string,
      event: string,
      data: Record<string, unknown>,
    ) => void,
  ): void {
    this.#messageListeners.delete(callback);
  }

  /**
   * Add a listener for status changes of the websocket connection.
   */
  onStatusChange(callback: (status: SocketStatus) => void): void {
    this.#statusListeners.add(callback);
  }

  /**
   * Remove a listener for status changes of the websocket connection.
   */
  removeStatusListener(callback: (status: SocketStatus) => void): void {
    this.#statusListeners.delete(callback);
  }

  /**
   * Connect the client to the server.
   * The client will automatically reconnect and rejoin rooms if the connection is lost.
   */
  connect(): void {
    this.#socket = new WebSocket(`ws://127.0.0.1:${this.port}`);
    this.#manualClose = false;
    this.#notifyStatus("connecting");
    this.#socket.addEventListener("open", (_event) => {
      this.#notifyStatus("open");
      if (this.#isReconnect) {
        this.#notifyStatus("reconnected");
        this.#isReconnect = false;
      }
      this.#socket.addEventListener("close", (_event) => {
        this.#notifyStatus("closed");
        if (!this.#manualClose) {
          this.#retryReconnect(1000);
        }
      });
      this.#socket.addEventListener("message", (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch (_e) {
          data = {
            data: event.data,
          };
        }
        console.log("Received message:", data);
      });
    });
    this.#socket.addEventListener("error", (_event) => {
      this.#notifyStatus("error");
    });
  }

  #notifyStatus(status: SocketStatus): void {
    for (const listener of this.#statusListeners) {
      listener(status);
    }
  }

  #retryReconnect(attempts: number): void {
    let count = 0;
    this.#isReconnect = true;
    const interval = setInterval(() => {
      if (count >= attempts) {
        clearInterval(interval);
        return;
      }
      if (this.connected) {
        clearInterval(interval);
        return;
      }
      if (this.closed) {
        count++;
        console.log(`Reconnecting... ${count}/${attempts}`);
        this.#reconnect();
      }
    }, 1000);
  }

  #reconnect() {
    if (this.closed) {
      this.connect();
    }
  }

  /**
   * Disconnect the client from the server.
   */
  disconnect(): void {
    this.#manualClose = true;
    this.#socket.close();
  }

  send(message: Record<string, unknown>): void {
    if (!this.connected) {
      return;
    }
    this.#socket.send(JSON.stringify(message));
  }
}
