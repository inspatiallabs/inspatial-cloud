import type { SocketStatus } from "./in-live-types.ts";

/**
 * RealtimeClient is a WebSocket client to connect to the Realtime Extension of InSpatial Server.
 * It provides an easy way to join and leave rooms and add listeners for messages from the rooms.
 */
export class InLiveClientBase {
  #socket!: WebSocket;
  readonly #host: string;
  #isReconnect: boolean = false;

  #authToken?: string;
  #rooms: Set<string> = new Set();
  #messageListeners: Set<
    (room: string, event: string, data: Record<string, unknown>) => void
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
  connect(authToken?: string): void {
    if (authToken) {
      this.#authToken = authToken;
    }
    this.#socket = new WebSocket(this.#endpoint);
    this.#manualClose = false;
    this.#notifyStatus("connecting");
    this.#socket.addEventListener("open", (_event) => {
      this.#notifyStatus("open");
      if (this.#isReconnect) {
        this.#notifyStatus("reconnected");
        this.#isReconnect = false;
      }
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

  #rejoinRooms(): void {
    for (const roomName in this.#rooms) {
      this.#send({ type: "join", roomName });
    }
  }

  /**
   * Join a room.
   */
  join(roomName: string): void {
    if (this.#rooms.has(roomName)) {
      return;
    }
    this.#rooms.add(roomName);
    this.#send({ type: "join", roomName });
  }

  /**
   * Leave a room.
   */
  leave(roomName: string): void {
    if (!this.#rooms.has(roomName)) {
      return;
    }
    this.#send({ type: "leave", roomName });
    this.#rooms.delete(roomName);
  }

  /**
   * Disconnect the client from the server.
   */
  disconnect(): void {
    this.#manualClose = true;
    this.#socket.close();
  }

  #send(message: Record<string, unknown>): void {
    if (!this.connected) {
      return;
    }
    this.#socket.send(JSON.stringify(message));
  }
}
