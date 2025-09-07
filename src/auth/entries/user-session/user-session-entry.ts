import { EntryType } from "~/orm/entry/entry-type.ts";

import { generateSalt } from "~/auth/security.ts";

export const userSessionEntry = new EntryType("userSession", {
  label: "User Session",
  description: "An authenticated user session",
  systemGlobal: true,
  idMode: "ulid",
  fields: [{
    key: "user",
    label: "User",
    type: "ConnectionField",
    entryType: "user",
    required: true,
    description: "The user associated with this session",
  }, {
    key: "sessionId",
    label: "Session ID",
    type: "DataField",
    description: "Unique identifier for the session",
    required: true,
    readOnly: true,
  }, {
    key: "sessionData",
    label: "Session Data",
    type: "JSONField",
    description: "Data associated with the session",
  }],
  defaultListFields: ["user"],
  hooks: {
    beforeCreate: [{
      name: "setSessionId",
      description: "Set the session ID to a unique value",
      handler({ userSession }): void {
        userSession.$sessionId = generateSalt(32);
      },
    }],
  },
});
