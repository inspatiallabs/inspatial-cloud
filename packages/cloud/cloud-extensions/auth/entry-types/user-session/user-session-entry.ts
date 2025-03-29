import { EntryType } from "#orm";
import fields from "#extension/auth/entry-types/user-session/fields.ts";
import type { UserSession } from "#extension/auth/entry-types/generated-types/user-session.ts";
import { generateSalt } from "#extension/auth/security.ts";

const userSessionEntry = new EntryType<UserSession>("userSession", {
  label: "User Session",
  description: "An authenticated user session",
  idMode: "ulid",
  fields: fields,
  actions: [],
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

export default userSessionEntry;
