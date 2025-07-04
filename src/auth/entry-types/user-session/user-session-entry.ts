import { EntryType } from "~/orm/entry/entry-type.ts";

import fields from "~/auth/entry-types/user-session/fields.ts";
import { generateSalt } from "~/auth/security.ts";
import type { UserSession } from "./user-session.type.ts";

export const userSessionEntry = new EntryType<UserSession>("userSession", {
  label: "User Session",
  description: "An authenticated user session",
  idMode: "ulid",
  fields: fields,
  actions: [],
  defaultListFields: ["user"],
  hooks: {
    beforeCreate: [{
      name: "setSessionId",
      description: "Set the session ID to a unique value",
      handler({ userSession }): void {
        userSession.sessionId = generateSalt(32);
      },
    }],
  },
});
