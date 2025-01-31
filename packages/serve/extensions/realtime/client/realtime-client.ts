/**
 * RealtimeClient is a WebSocket client to connect to the Realtime Extension of InSpatial Server.
 * It provides an easy way to join and leave rooms and add listeners for messages from the rooms.
 */
class RealtimeClient {
  private socket!: WebSocket;
  private readonly host: string;

  private authToken?: string;
  private rooms: Map<string, Set<string>> = new Map();
  private messageListeners: Set<
    (room: string, event: string, data: any) => void
  > = new Set();
  private statusListeners: Set<(status: SocketStatus) => void> = new Set();
  private manualClose = false;

  get endpoint(): string {
    let url = this.host;
    if (this.authToken) {
      url += `?authToken=${this.authToken}`;
    }
    return url;
  }
  get connected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  get connecting(): boolean {
    return this.socket?.readyState === WebSocket.CONNECTING;
  }

  get closed(): boolean {
    return this.socket?.readyState === WebSocket.CLOSED;
  }

  constructor(host?: string) {
    const protocol = globalThis.location.protocol === "https:" ? "wss" : "ws";
    this.host = host || `${protocol}://${globalThis.location.host}/ws`;
  }

  onMessage(
    callback: (room: string, event: string, data: Record<string, any>) => void,
  ): void {
    this.messageListeners.add(callback);
  }

  removeMessageListener(
    callback: (room: string, event: string, data: Record<string, any>) => void,
  ): void {
    this.messageListeners.delete(callback);
  }

  onStatusChange(callback: (status: SocketStatus) => void): void {
    this.statusListeners.add(callback);
  }

  removeStatusListener(callback: (status: SocketStatus) => void): void {
    this.statusListeners.delete(callback);
  }

  connect(authToken?: string): void {
    if (authToken) {
      this.authToken = authToken;
    }
    this.socket = new WebSocket(this.endpoint);
    this.manualClose = false;
    this.notifyStatus("connecting");
    this.socket.addEventListener("open", (_event) => {
      this.notifyStatus("open");
      this.rejoinRooms();
      this.socket.addEventListener("close", (_event) => {
        this.notifyStatus("closed");
        if (!this.manualClose) {
          this.retryReconnect(1000);
        }
      });
      this.socket.addEventListener("message", (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch (_e) {
          data = {
            data: event.data,
          };
        }
        if ("room" in data && "event" in data && "data" in data) {
          for (const listener of this.messageListeners) {
            listener(data.room, data.event, data.data);
          }
        }
      });
    });
    this.socket.addEventListener("error", (_event) => {
      this.notifyStatus("error");
    });
  }

  private notifyStatus(status: SocketStatus): void {
    for (const listener of this.statusListeners) {
      listener(status);
    }
  }

  private retryReconnect(attempts: number): void {
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
        this.reconnect();
      }
    }, 1000);
  }

  private reconnect() {
    if (this.closed) {
      this.connect();
    }
  }

  private rejoinRooms(): void {
    for (const [room, events] of this.rooms) {
      if (events.size === 0) {
        this.send({ type: "join", room });
        return;
      }

      this.send({ type: "join", room, events: Array.from(events) });
    }
  }

  join(room: string, event?: string): void {
    if (!this.rooms.has(room)) {
      const roomEvents = new Set<string>();

      this.rooms.set(room, roomEvents);
    }
    const events = this.rooms.get(room)!;
    if (event && !events.has(event)) {
      events.add(event);
    }

    this.send({ type: "join", room, event });
  }

  leave(room: string, event?: string): void {
    if (event) {
      this.rooms.get(room)?.delete(event);
    } else {
      this.rooms.delete(room);
    }
    this.send({ type: "leave", room, event });
  }

  disconnect() {
    this.manualClose = true;
    this.socket.close();
  }

  private send(message: Record<string, any>): void {
    if (!this.connected) {
      return;
    }
    this.socket.send(JSON.stringify(message));
  }
}
type SocketStatus = "open" | "closed" | "connecting" | "error";
export default RealtimeClient;
