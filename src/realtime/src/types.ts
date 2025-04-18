/**
 * A user connected to the realtime server.
 */
export interface RealtimeUser {
  /**
   * The id of the user.
   */
  id: string;
  /**
   * The name of the user.
   */
  name?: string;
}

/**
 * A client connected to the realtime server.
 */
export interface RealtimeClient {
  /**
   * The id of the client.
   */
  id: string;

  /**
   * The websocket connection to the client.
   */
  socket: WebSocket;
  /**
   * The user associated with the client.
   */
  user: RealtimeUser;

  /**
   * The rooms the client is in
   */
  rooms: Set<string>;
}

/**
 * A definition of a room.
 */
export interface RealtimeRoomDef {
  /**
   * The name of the room.
   */
  roomName: string;
  /**
   * A description of the room
   */
  description?: string;
}

/**
 * A message received from a client.
 */
export type RealtimeClientMessage<
  T extends Record<string, any> = Record<string, any>,
> = {
  /**
   * The type of message.
   */
  type: "join" | "leave" | "message";
  /**
   * The name of the room the message is for.
   */
  roomName: string;
  /**
   * The data of the message.
   */
  data: T;
};

/**
 * A message sent to a broadcast channel to synchronize server instances.
 */
export type RealtimeBroadcastMessage<
  T extends Record<string, any> = Record<string, any>,
> = {
  /**
   * The name of the room to broadcast to.
   */
  roomName: string;
  /**
   * The event to broadcast.
   */
  event: string;
  /**
   * The data to broadcast.
   */
  data: T;
};

/**
 * A union of all possible realtime messages.
 */
export type RealtimeMessage = RealtimeClientMessage | RealtimeBroadcastMessage;
