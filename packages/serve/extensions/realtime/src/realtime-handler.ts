import type { InRequest } from "#/in-request.ts";
import { raiseServerException } from "#/server-exception.ts";
import type {
  RealtimeBroadcastMessage,
  RealtimeClient,
  RealtimeClientMessage,
  RealtimeMessage,
  RealtimeRoomDef,
} from "#realtime/types.ts";
import { RealtimeRoom } from "#realtime/realtime-room.ts";

export class RealtimeHandler {
  clients: Map<string, RealtimeClient>;

  channel: BroadcastChannel;
  rooms: Map<string, RealtimeRoom> = new Map();

  roomHandlers: Map<
    string,
    Array<(client: RealtimeClient, message: RealtimeMessage) => void>
  >;
  info: {
    rooms: Array<RealtimeRoomDef>;
  } = {
    rooms: [],
  };
  constructor() {
    this.roomHandlers = new Map();
    this.clients = new Map();
    this.channel = new BroadcastChannel("realtime");
    this.channel.addEventListener(
      "message",
      (
        messageEvent: MessageEvent<RealtimeBroadcastMessage>,
      ) => {
        const message = messageEvent.data;
        this.sendToRoom(message);
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
    handler: (client: RealtimeClient, message: RealtimeMessage) => void,
  ) {
    if (!this.roomHandlers.has(roomName)) {
      this.roomHandlers.set(roomName, []);
    }
    this.roomHandlers.get(roomName)?.push(handler);
  }
  handleUpgrade(inRequest: InRequest): Response {
    if (inRequest.upgradeSocket) {
      const { socket, response } = Deno.upgradeWebSocket(
        inRequest.request,
      );
      this.addClient(socket);
      return response;
    }

    return new Response("request isn't trying to upgrade to websocket.", {
      status: 400,
    });
  }

  private addClient(socket: WebSocket) {
    const id = Math.random().toString(36).substring(7);
    const client: RealtimeClient = {
      id,
      socket,
      user: {
        id,
      },
      rooms: new Set(),
    };
    this.addListeners(client);
    return client.id;
  }
  private addListeners(client: RealtimeClient) {
    client.socket.onopen = () => {
      this.clients.set(client.id, client);
      this.handleConnection(client);
    };
    client.socket.onmessage = (event) => {
      let data: Record<string, any> = {};
      try {
        data = JSON.parse(event.data);
      } catch (e) {
        console.warn("Error parsing JSON data from client", event.data);
        return;
      }
      this.handleMessage(client, data);
    };
    client.socket.onclose = () => {
      this.handleClose(client);

      this.clients.delete(client.id);
    };
  }
  handleConnection(_client: RealtimeClient) {
  }

  getRoom(roomName: string): RealtimeRoom {
    const room = this.rooms.get(roomName);
    if (!room) {
      raiseServerException(404, `Room ${roomName} not found`);
    }
    return room;
  }
  leave(roomName: string, client: RealtimeClient): void {
    this.validateRoom(roomName);
    const room = this.getRoom(roomName);

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

  notify(message: RealtimeBroadcastMessage) {
    this.sendToRoom(
      message,
    );
    this.channel.postMessage(message);
  }
  private validateRoom(room: string) {
    if (!this.rooms.has(room)) {
      this.addRoom({
        roomName: room,
      });
      return;
    }
  }

  addRoom(room: RealtimeRoomDef) {
    if (this.rooms.has(room.roomName)) {
      return;
    }
    const newRoom = new RealtimeRoom(room.roomName);
    this.rooms.set(room.roomName, newRoom);
    this.info.rooms.push(room);
  }

  addRooms(rooms: RealtimeRoomDef[]) {
    for (const room of rooms) {
      this.addRoom(room);
    }
  }

  private sendToRoom(
    message: RealtimeBroadcastMessage,
  ) {
    this.validateRoom(message.roomName);
    const room = this.getRoom(message.roomName);

    for (const clientId of room.clients) {
      const client = this.clients.get(clientId);
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

  join(roomName: string, client: RealtimeClient): void {
    this.validateRoom(roomName);

    const room = this.getRoom(roomName);
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

  assertClientMessage(
    data: Record<string, any>,
  ): asserts data is RealtimeClientMessage {
    if (!data.roomName) {
      raiseServerException(400, "No room specified in message");
    }
    if (!data.type) {
      raiseServerException(400, "No type specified in message");
    }
  }
  handleMessage(
    client: RealtimeClient,
    message: Record<string, any>,
  ): void {
    this.assertClientMessage(message);
    switch (message.type) {
      case "join":
        this.join(message.roomName, client);
        return;
      case "leave":
        this.leave(message.roomName, client);
        return;
      default:
        break;
    }
    const handlers = this.roomHandlers.get(message.roomName);
    if (handlers) {
      for (const handler of handlers) {
        handler(client, message);
      }
    }
  }
  handleClose(client: RealtimeClient): void {
    const rooms = this.clients.get(client.id)?.rooms;
    if (rooms) {
      for (const room of rooms) {
        this.leave(room, client);
      }
    }
  }
}
