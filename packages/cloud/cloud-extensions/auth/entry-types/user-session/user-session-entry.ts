import { EntryType } from "#orm";
import fields from "#extension/auth/entry-types/user-session/fields.ts";
import type { UserSession } from "#extension/auth/entry-types/generated-types/user-session.ts";

const userSessionEntry = new EntryType<UserSession>("userSession", {
  label: "User Session",
  description: "An authenticated user session",
  idMode: "ulid",
  fields: fields,
  actions: [],
});

export default userSessionEntry;
