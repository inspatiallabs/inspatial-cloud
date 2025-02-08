/**
 * RealtimeClient is a WebSocket client to connect to the Realtime Extension of InSpatial Server.
 * It provides an easy way to join and leave rooms and add listeners for messages from the rooms.
 */
export class RealtimeClient {
  #socket!: WebSocket;
  readonly #host: string;

  #authToken?: string;
  #rooms: Map<string, Set<string>> = new Map();
  #messageListeners: Set<
    (room: string, event: string, data: any) => void
  > = new Set();
  #statusListeners: Set<(status: SocketStatus) => void> = new Set();
  #manualClose = false;

  /**
   * The endpoint of the server.
   */
  get #endpoint(): string {
    let url = this.#host;
    if (this.#authToken) {
      url += `?authToken=${this.#authToken}`;
    }
    return url;
  }

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

  /**
   * Create a new RealtimeClient.
   * @param host The host of the server.
   *
   * @example
   * ```ts
   * const client = new RealtimeClient("ws://localhost:8080/ws");
   * client.connect();
   * ```
   */
  constructor(host?: string) {
    const protocol = globalThis?.location?.protocol === "https:" ? "wss" : "ws";
    this.#host = host ||
      `${protocol}://${globalThis?.location?.host || "localhost"}/ws`;
  }

  /**
   * Add a listener for messages from the server.
   */
  onMessage(
    callback: (room: string, event: string, data: Record<string, any>) => void,
  ): void {
    this.#messageListeners.add(callback);
  }

  /**
   * Remove a listener for messages from the server.
   */
  removeMessageListener(
    callback: (room: string, event: string, data: Record<string, any>) => void,
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
  connect(authToken?: string): void {
    if (authToken) {
      this.#authToken = authToken;
    }
    this.#socket = new WebSocket(this.#endpoint);
    this.#manualClose = false;
    this.#notifyStatus("connecting");
    this.#socket.addEventListener("open", (_event) => {
      this.#notifyStatus("open");
      this.#rejoinRooms();
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
        if ("roomName" in data && "event" in data && "data" in data) {
          for (const listener of this.#messageListeners) {
            listener(data.roomName, data.event, data.data);
          }
        }
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

  #rejoinRooms(): void {
    for (const [roomName, events] of this.#rooms) {
      if (events.size === 0) {
        this.#send({ type: "join", roomName });
        return;
      }

      this.#send({ type: "join", roomName, events: Array.from(events) });
    }
  }

  /**
   * Join a room.
   */
  join(roomName: string, event?: string): void {
    if (!this.#rooms.has(roomName)) {
      const roomEvents = new Set<string>();

      this.#rooms.set(roomName, roomEvents);
    }
    const events = this.#rooms.get(roomName)!;
    if (event && !events.has(event)) {
      events.add(event);
    }

    this.#send({ type: "join", roomName, event });
  }

  /**
   * Leave a room.
   */
  leave(roomName: string, event?: string): void {
    if (event) {
      this.#rooms.get(roomName)?.delete(event);
    } else {
      this.#rooms.delete(roomName);
    }
    this.#send({ type: "leave", roomName, event });
  }

  /**
   * Disconnect the client from the server.
   */
  disconnect() {
    this.#manualClose = true;
    this.#socket.close();
  }

  #send(message: Record<string, any>): void {
    if (!this.connected) {
      return;
    }
    this.#socket.send(JSON.stringify(message));
  }
}
/**
 * The status of the websocket connection.
 */
export type SocketStatus = "open" | "closed" | "connecting" | "error";

/**
 * RealtimeClient is a WebSocket client to connect to the Realtime Extension of InSpatial Server.
 * It provides an easy way to join and leave rooms and add listeners for messages from the rooms.
 */
export default RealtimeClient;
