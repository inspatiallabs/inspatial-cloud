import type { InLiveUser } from "/in-live/types.ts";

export class InLiveRoom {
  roomName: string;

  clients: Set<string> = new Set();
  users: Map<string, InLiveUser> = new Map();
  constructor(roomName: string) {
    this.roomName = roomName;
  }
}
