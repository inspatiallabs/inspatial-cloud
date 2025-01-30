import type { InRequest } from "#/in-request.ts";
import { raiseServerException } from "#/server-exception.ts";

class SocketRoom {
  roomName: string;

  clients: Set<string> = new Set();
  users: Map<string, User> = new Map();
  constructor(roomName: string) {
    this.roomName = roomName;
  }
}

interface User {
  id: string;
  name?: string;
}
export interface RealtimeClient {
  id: string;
  socket: WebSocket;
  user: User;
  rooms: Set<string>;
}

export interface RealtimeRoomDef {
  roomName: string;
  description?: string;
}
export interface RealtimeMessage {
  room: string;
  event: string;
  data: Record<string, any>;
}

export interface RealtimeClientMessage extends RealtimeMessage {
  type: "join" | "leave" | "message";
}

export class RealtimeHandler {
  clients: Map<string, RealtimeClient>;

  channel: BroadcastChannel;
  rooms: Map<string, SocketRoom> = new Map();

  roomHandlers: Map<
    string,
    (client: RealtimeClient, message: RealtimeMessage) => void
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
        messageEvent: MessageEvent<RealtimeMessage>,
      ) => {
        const { room, event, data } = messageEvent.data;
        this.sendToRoom(room, event, data);
      },
    );
  }

  addRoomHandler(
    room: string,
    handler: (client: RealtimeClient, message: RealtimeMessage) => void,
  ) {
    this.roomHandlers.set(room, handler);
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
      let data;
      try {
        data = JSON.parse(event.data);
      } catch (e) {
        console.error("Error parsing JSON data from client", e);
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

  getRoom(roomName: string): SocketRoom {
    const room = this.rooms.get(roomName);
    if (!room) {
      raiseServerException(404, `Room ${roomName} not found`);
    }
    return room;
  }
  leave(roomName: string, client: RealtimeClient, _data: any): void {
    this.validateRoom(roomName);
    const room = this.getRoom(roomName);

    this.notify(roomName, "leave", {
      roomName,
      user: client.user,
      users: Array.from(room.clients).filter((c) => c !== client.id),
    });
    room.clients.delete(client.id);

    // this.rooms[room].users = this.rooms[room].users.filter((u) =>
    //   u?.id && u.id !== client.user?.id
    // );

    client.rooms.delete(roomName);
  }

  notify(room: string, event: string, data: Record<string, any>) {
    this.sendToRoom(
      room,
      event,
      data,
    );
    this.channel.postMessage({
      room,
      event,
      data,
    });
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
    const newRoom = new SocketRoom(room.roomName);
    this.rooms.set(room.roomName, newRoom);
    this.info.rooms.push(room);
  }

  addRooms(rooms: RealtimeRoomDef[]) {
    for (const room of rooms) {
      this.addRoom(room);
    }
  }

  private sendToRoom(
    roomName: string,
    event: string,
    data: Record<string, any>,
  ) {
    this.validateRoom(roomName);
    const room = this.getRoom(roomName);

    for (const clientId of room.clients) {
      const client = this.clients.get(clientId);
      if (!client) {
        room.clients.delete(clientId);
        continue;
      }

      if (client.socket.readyState !== WebSocket.OPEN) {
        continue;
      }
      client.socket.send(JSON.stringify({
        roomName,
        event,
        data,
      }));
    }
  }

  join(roomName: string, client: RealtimeClient, data: any): void {
    this.validateRoom(roomName);

    const room = this.getRoom(roomName);
    if (room.clients.has(client.id)) {
      return;
    }

    room.clients.add(client.id);
    client.rooms.add(roomName);
    this.notify(roomName, "join", {
      roomName,
      user: client.user,

      users: Array.from(room.clients),
    });
  }

  handleMessage(
    client: RealtimeClient,
    data: RealtimeClientMessage,
  ): void {
    switch (data.type) {
      case "join":
        this.join(data.room, client, data);
        break;
      case "leave":
        this.leave(data.room, client, data);
        break;
      default:
        break;
    }
  }
  handleClose(client: RealtimeClient): void {
    const rooms = this.clients.get(client.id)?.rooms;
    if (rooms) {
      for (const room of rooms) {
        this.leave(room, client, {});
      }
    }
  }
}
