import type {
  InLiveBroadcastMessage,
  InLiveClient,
  InLiveClientMessage,
  InLiveMessage,
  InLiveRoomDef,
} from "~/in-live/types.ts";
import { raiseServerException } from "~/serve/server-exception.ts";
import type { InRequest } from "~/serve/in-request.ts";
import { InLiveRoom } from "~/in-live/in-live-room.ts";
import type { BrokerClient } from "./broker-client.ts";

import type { SessionData } from "../auth/types.ts";
import type { InCloud } from "../in-cloud.ts";
import { ORMException } from "../orm/orm-exception.ts";
import { getInLog } from "#inLog";
import type { EntryName, SettingsName } from "#types/models.ts";

/**
 * Handles realtime websocket connections
 */
export class InLiveHandler {
  #clients: Map<string, InLiveClient>;
  #shuttingDown: boolean = false;
  #channel: BrokerClient;
  #rooms: Map<string, InLiveRoom> = new Map();

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
  inCloud: InCloud;
  globalAccountId: string = "";
  entryTypes: Set<string> = new Set();
  globalEntryTypes: Set<string> = new Set();
  settingsTypes: Set<string> = new Set();
  globalSettingsTypes: Set<string> = new Set();
  #broadcastToChannel: (message: InLiveBroadcastMessage) => void = () => {};
  constructor(inCloud: InCloud, channel: BrokerClient) {
    this.inCloud = inCloud;
    this.#roomHandlers = new Map();
    this.#clients = new Map();
    this.#channel = channel;
    this.#broadcastToChannel = this.#channel.addChannel<InLiveBroadcastMessage>(
      "inLive",
      (message) => this.#sendToRoom(message),
    );
  }

  #handleError(...args: any) {
    getInLog("cloud").error(args, "InLiveHandler");
  }
  init() {
    this.globalAccountId = this.inCloud.orm.systemGobalUser.accountId;
  }

  shutdown() {
    const inLog = getInLog("cloud");
    this.#shuttingDown = true;
    inLog.debug("Shutting down InLiveHandler...", {
      compact: true,
      subject: "InLiveHandler",
    });
    this.#channel.stop();
    this.#clients.forEach((client) => {
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.close(0, "Server is shutting down");
      }
    });
    this.#clients.clear();
    this.#rooms.clear();
    inLog.debug("InLiveHandler shutdown complete.", {
      compact: true,
      subject: "InLiveHandler",
    });
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
    const inLog = getInLog("cloud");
    if (this.#shuttingDown) {
      inLog.debug(
        "InLiveHandler is shutting down, refusing new connections.",
        {
          compact: true,
          subject: "InLiveHandler",
        },
      );
      return new Response("Service Unavailable", { status: 503 });
    }
    const user = inRequest.context.get<SessionData>("user");
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }
    if (inRequest.upgradeSocket) {
      const { socket, response } = Deno.upgradeWebSocket(
        inRequest.request,
      );
      this.#addClient(socket, user);
      return response;
    }

    return new Response("request isn't trying to upgrade to websocket.", {
      status: 400,
    });
  }

  #addClient(socket: WebSocket, user: SessionData) {
    const id = Math.random().toString(36).substring(7);
    const client: InLiveClient = {
      id,
      socket,
      user,
      rooms: new Set(),
    };
    this.#addListeners(client);
    return client.id;
  }
  #addListeners(client: InLiveClient) {
    const inLog = getInLog("cloud");
    client.socket.onopen = () => {
      this.#clients.set(client.id, client);
      this.#handleConnection(client);
    };
    client.socket.addEventListener("message", (event) => {
      let data: Record<string, any> = {};
      try {
        data = JSON.parse(event.data);
      } catch (_e) {
        inLog.warn("Error parsing JSON data from client", event.data);
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
        if (readyState === WebSocket.CLOSED) {
          return;
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
  #handleConnection(client: InLiveClient) {
    if (
      client.user.systemAdmin
    ) {
      this.#join("system:dev", client, true);
    }
  }

  #getRoom({ roomName, accountId }: {
    roomName: string;
    accountId?: string;
  }): InLiveRoom {
    const room = this.#rooms.get(
      `${accountId ? accountId + ":" : ""}${roomName}`,
    );
    if (!room) {
      raiseServerException(404, `Room ${roomName} not found`);
    }
    return room;
  }
  #leave(
    roomName: string,
    client: InLiveClient,
    global?: boolean,
  ): void {
    if (global && !client.user.systemAdmin) {
      return;
    }
    let accountId = global ? undefined : client.user.accountId;
    const [prefix, name] = roomName.split(":");
    try {
      switch (prefix) {
        case "entry":
        case "entryType": {
          const entryType = this.inCloud.orm.withUser(client.user).getEntryType(
            name as EntryName,
          );
          if (entryType.systemGlobal) {
            accountId = this.globalAccountId;
          }
          break;
        }
        case "settings": {
          const settings = this.inCloud.orm.withUser(client.user)
            .getSettingsType(name as SettingsName);
          if (settings.systemGlobal) {
            accountId = this.globalAccountId;
          }
          break;
        }
      }
    } catch (e) {
      getInLog("cloud").error(e, "InLiveHandler#join");
      return;
    }

    this.#validateRoom({ roomName, accountId });
    const room = this.#getRoom({
      roomName,
      accountId,
    });
    const inLiveUser = {
      id: client.user.userId,
      firstName: client.user.firstName,
      lastName: client.user.lastName,
      email: client.user.email,
    };
    room.users.delete(client.id);
    this.notify({
      accountId,
      roomName,
      event: "leave",
      data: {
        user: inLiveUser,
        event: "leave",
        room: roomName,
        users: Array.from(room.users.values()),
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
    this.#broadcastToChannel(message);
  }

  announce(message: string | Record<string, any>): void {
    const broadcastMessage: InLiveBroadcastMessage = {
      accountId: "everyone",
      roomName: "everyone",
      event: "announce",
      data: typeof message === "string" ? { message } : message,
    };
    this.#broadcastToChannel(broadcastMessage);
    this.#sendToAll(broadcastMessage);
  }
  #sendToAll(message: InLiveBroadcastMessage) {
    this.#clients.forEach((client) => {
      if (client.socket.readyState !== WebSocket.OPEN) {
        return;
      }
      client.socket.send(JSON.stringify(message));
    });
  }
  #validateRoom({ roomName, accountId }: {
    roomName: string;
    accountId?: string;
  }) {
    const name = `${accountId ? accountId + ":" : ""}${roomName}`;
    if (!this.#rooms.has(name)) {
      this.addRoom({
        roomName: name,
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
    if (message.roomName === "everyone") {
      this.#sendToAll(message);
      return;
    }
    const { accountId, roomName } = message;
    this.#validateRoom({ roomName, accountId });
    const room = this.#getRoom({ roomName, accountId });

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

  #join(roomName: string, client: InLiveClient, global?: boolean): void {
    if (global && !client.user.systemAdmin) {
      return;
    }
    let accountId = global ? undefined : client.user.accountId;
    const [prefix, name] = roomName.split(":");
    try {
      switch (prefix) {
        case "entry":
        case "entryType": {
          const entryType = this.inCloud.orm.withUser(client.user).getEntryType(
            name as EntryName,
          );
          if (entryType.systemGlobal) {
            accountId = this.globalAccountId;
          }
          break;
        }
        case "settings": {
          const settings = this.inCloud.orm.withUser(client.user)
            .getSettingsType(name as SettingsName);
          if (settings.systemGlobal) {
            accountId = this.globalAccountId;
          }
          break;
        }
      }
    } catch (e) {
      if (e instanceof ORMException) {
        this.inCloud.inLog.warn(`${e.name}: ${e.message}`, "InLive-Join");
        return;
      }
      getInLog("cloud").error(e, "InLiveHandler#join");
      return;
    }
    this.#validateRoom({
      roomName,
      accountId,
    });

    const room = this.#getRoom({
      roomName,
      accountId,
    });
    if (room.clients.has(client.id)) {
      return;
    }

    room.clients.add(client.id);
    const inLiveUser = {
      id: client.user.userId,
      firstName: client.user.firstName,
      lastName: client.user.lastName,
      email: client.user.email,
      profilePicture: client.user.profilePicture,
    };
    room.users.set(client.id, inLiveUser);
    client.rooms.add(roomName);
    this.notify({
      accountId,
      roomName,
      event: "join",
      data: {
        roomName,
        event: "join",
        user: inLiveUser,
        users: Array.from(room.users.values()),
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
        this.#join(message.roomName, client, message.global);
        return;
      case "leave":
        this.#leave(message.roomName, client, message.global);
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
        if (room === "system:dev") {
          this.#leave(room, client, true);
          continue;
        }
        this.#leave(room, client);
      }
    }
  }
}
