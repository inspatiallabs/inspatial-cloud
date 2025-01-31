import type { RealtimeUser } from "#realtime/types.ts";

export class RealtimeRoom {
  roomName: string;

  clients: Set<string> = new Set();
  users: Map<string, RealtimeUser> = new Map();
  constructor(roomName: string) {
    this.roomName = roomName;
  }
}
