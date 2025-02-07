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

  get endpoint(): string {
    let url = this.#host;
    if (this.#authToken) {
      url += `?authToken=${this.#authToken}`;
    }
    return url;
  }
  get connected(): boolean {
    return this.#socket?.readyState === WebSocket.OPEN;
  }

  get connecting(): boolean {
    return this.#socket?.readyState === WebSocket.CONNECTING;
  }

  get closed(): boolean {
    return this.#socket?.readyState === WebSocket.CLOSED;
  }

  constructor(host?: string) {
    const protocol = globalThis?.location?.protocol === "https:" ? "wss" : "ws";
    this.#host = host ||
      `${protocol}://${globalThis?.location?.host || "localhost"}/ws`;
  }

  onMessage(
    callback: (room: string, event: string, data: Record<string, any>) => void,
  ): void {
    this.#messageListeners.add(callback);
  }

  removeMessageListener(
    callback: (room: string, event: string, data: Record<string, any>) => void,
  ): void {
    this.#messageListeners.delete(callback);
  }

  onStatusChange(callback: (status: SocketStatus) => void): void {
    this.#statusListeners.add(callback);
  }

  removeStatusListener(callback: (status: SocketStatus) => void): void {
    this.#statusListeners.delete(callback);
  }

  connect(authToken?: string): void {
    if (authToken) {
      this.#authToken = authToken;
    }
    this.#socket = new WebSocket(this.endpoint);
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

  leave(roomName: string, event?: string): void {
    if (event) {
      this.#rooms.get(roomName)?.delete(event);
    } else {
      this.#rooms.delete(roomName);
    }
    this.#send({ type: "leave", roomName, event });
  }

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
type SocketStatus = "open" | "closed" | "connecting" | "error";
export default RealtimeClient;
