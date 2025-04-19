import type {
  InLiveBroadcastMessage,
  InLiveClient,
  InLiveClientMessage,
  InLiveMessage,
  InLiveRoomDef,
} from "#/in-live/types.ts";
import { raiseServerException } from "#/app/server-exception.ts";
import type { InRequest } from "#/app/in-request.ts";
import { InLiveRoom } from "#/in-live/in-live-room.ts";
import { inLog } from "#/in-log/in-log.ts";

/**
 * Handles realtime websocket connections
 */
export class InLiveHandler {
  #clients: Map<string, InLiveClient>;

  #channel: BroadcastChannel;
  #rooms: Map<string, InLiveRoom> = new Map();

  #handleError(...args: any) {
    inLog.error(args, "InLiveHandler");
  }
  #roomHandlers: Map<
    string,
    Array<(client: InLiveClient, message: InLiveMessage) => void>
  >;
  /**
   * Information about the realtime handler
   */
  info: {
    rooms: Array<InLiveRoomDef>;
  } = {
    rooms: [],
  };

  /**
   * Create a new RealtimeHandler
   */
  constructor() {
    this.#roomHandlers = new Map();
    this.#clients = new Map();
    this.#channel = new BroadcastChannel("realtime");
    this.#channel.addEventListener(
      "message",
      (
        messageEvent: MessageEvent<InLiveBroadcastMessage>,
      ) => {
        const message = messageEvent.data;
        this.#sendToRoom(message);
      },
    );
  }

  /**
   * Add a handler to the specified room
   * @param roomName The name of the room to add the handler to
   * @param handler The handler function to add
   */
  addRoomHandler(
    roomName: string,
    handler: (client: InLiveClient, message: InLiveMessage) => void,
  ): void {
    if (!this.#roomHandlers.has(roomName)) {
      this.#roomHandlers.set(roomName, []);
    }
    this.#roomHandlers.get(roomName)?.push(handler);
  }

  /**
   * Upgrade a request to a websocket connection
   */
  handleUpgrade(inRequest: InRequest): Response {
    if (inRequest.upgradeSocket) {
      const { socket, response } = Deno.upgradeWebSocket(
        inRequest.request,
      );
      this.#addClient(socket);
      return response;
    }

    return new Response("request isn't trying to upgrade to websocket.", {
      status: 400,
    });
  }

  #addClient(socket: WebSocket) {
    const id = Math.random().toString(36).substring(7);
    const client: InLiveClient = {
      id,
      socket,
      user: {
        id,
      },
      rooms: new Set(),
    };
    this.#addListeners(client);
    return client.id;
  }
  #addListeners(client: InLiveClient) {
    client.socket.onopen = () => {
      this.#clients.set(client.id, client);
      this.#handleConnection(client);
    };
    client.socket.addEventListener("message", (event) => {
      let data: Record<string, any> = {};
      try {
        data = JSON.parse(event.data);
      } catch (_e) {
        serveLogger.warn("Error parsing JSON data from client", event.data);
        return;
      }
      try {
        this.#handleMessage(client, data);
      } catch (e) {
        this.#handleError(e);
      }
    });
    client.socket.onerror = (e) => {
      if (e instanceof ErrorEvent) {
        const readyState = client.socket.readyState;
        let socketState = "unknown";
        if (readyState === WebSocket.CONNECTING) {
          socketState = "connecting";
        } else if (readyState === WebSocket.OPEN) {
          socketState = "open";
        } else if (readyState === WebSocket.CLOSING) {
          socketState = "closing";
        } else if (readyState === WebSocket.CLOSED) {
          socketState = "closed";
        }
        const info = {
          client: client.id,
          readyState: client.socket.readyState,
          clientState: socketState,
          message: e.message,
          type: e.type,
          target: e.target,
        };

        this.#handleError(info);
        return;
      }
      this.#handleError(e);
    };
    client.socket.onclose = () => {
      this.#handleClose(client);

      this.#clients.delete(client.id);
    };
  }

  /**
   * Handle a new connection. Currently does nothing...
   */
  #handleConnection(_client: InLiveClient) {
  }

  #getRoom(roomName: string): InLiveRoom {
    const room = this.#rooms.get(roomName);
    if (!room) {
      raiseServerException(404, `Room ${roomName} not found`);
    }
    return room;
  }
  #leave(roomName: string, client: InLiveClient): void {
    this.#validateRoom(roomName);
    const room = this.#getRoom(roomName);

    this.notify({
      roomName,
      event: "leave",
      data: {
        user: client.user,
        event: "leave",
        room: roomName,
        users: Array.from(room.clients).filter((c) => c !== client.id),
      },
    });
    room.clients.delete(client.id);

    // this.rooms[room].users = this.rooms[room].users.filter((u) =>
    //   u?.id && u.id !== client.user?.id
    // );

    client.rooms.delete(roomName);
  }

  /**
   * Send a realtime message to a room
   */
  notify(message: InLiveBroadcastMessage): void {
    this.#sendToRoom(
      message,
    );
    this.#channel.postMessage(message);
  }

  announce(message: string | Record<string, any>): void {
    this.#clients.forEach((client) => {
      if (client.socket.readyState !== WebSocket.OPEN) {
        return;
      }
      client.socket.send(JSON.stringify({
        event: "announce",
        data: message,
      }));
    });
  }
  #validateRoom(room: string) {
    if (!this.#rooms.has(room)) {
      this.addRoom({
        roomName: room,
      });
      return;
    }
  }

  /**
   * Add a room to the handler
   * @param room The room to add
   */
  addRoom(room: InLiveRoomDef): void {
    if (this.#rooms.has(room.roomName)) {
      return;
    }
    const newRoom = new InLiveRoom(room.roomName);
    this.#rooms.set(room.roomName, newRoom);
    this.info.rooms.push(room);
  }

  /**
   * Add multiple rooms to the handler
   */
  addRooms(rooms: InLiveRoomDef[]): void {
    for (const room of rooms) {
      this.addRoom(room);
    }
  }

  #sendToRoom(
    message: InLiveBroadcastMessage,
  ) {
    this.#validateRoom(message.roomName);
    const room = this.#getRoom(message.roomName);

    for (const clientId of room.clients) {
      const client = this.#clients.get(clientId);
      if (!client) {
        room.clients.delete(clientId);
        continue;
      }

      if (client.socket.readyState !== WebSocket.OPEN) {
        continue;
      }
      client.socket.send(JSON.stringify(message));
    }
  }

  #join(roomName: string, client: InLiveClient): void {
    this.#validateRoom(roomName);

    const room = this.#getRoom(roomName);
    if (room.clients.has(client.id)) {
      return;
    }

    room.clients.add(client.id);
    client.rooms.add(roomName);
    this.notify({
      roomName,
      event: "join",
      data: {
        roomName,
        event: "join",
        user: client.user,
        users: Array.from(room.clients),
      },
    });
  }

  #assertClientMessage(
    data: Record<string, any>,
  ): asserts data is InLiveClientMessage {
    if (!data.roomName) {
      raiseServerException(400, "No room specified in message");
    }
    if (!data.type) {
      raiseServerException(400, "No type specified in message");
    }
  }
  #handleMessage(
    client: InLiveClient,
    message: Record<string, any>,
  ): void {
    this.#assertClientMessage(message);
    switch (message.type) {
      case "join":
        this.#join(message.roomName, client);
        return;
      case "leave":
        this.#leave(message.roomName, client);
        return;
      default:
        break;
    }
    const handlers = this.#roomHandlers.get(message.roomName);
    if (handlers) {
      for (const handler of handlers) {
        handler(client, message);
      }
    }
  }
  #handleClose(client: InLiveClient): void {
    const rooms = this.#clients.get(client.id)?.rooms;
    if (rooms) {
      for (const room of rooms) {
        this.#leave(room, client);
      }
    }
  }
}
