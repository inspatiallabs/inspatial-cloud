export interface RealtimeUser {
  id: string;
  name?: string;
}
export interface RealtimeClient {
  id: string;
  socket: WebSocket;
  user: RealtimeUser;
  rooms: Set<string>;
}

export interface RealtimeRoomDef {
  roomName: string;
  description?: string;
}

export type RealtimeClientMessage<
  T extends Record<string, any> = Record<string, any>,
> = {
  type: "join" | "leave" | "message";
  roomName: string;
  data: T;
};

export type RealtimeBroadcastMessage<
  T extends Record<string, any> = Record<string, any>,
> = {
  roomName: string;
  event: string;
  data: T;
};

export type RealtimeMessage = RealtimeClientMessage | RealtimeBroadcastMessage;
