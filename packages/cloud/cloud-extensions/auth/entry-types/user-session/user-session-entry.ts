import { EntryType } from "#orm";
import fields from "#extension/auth/entry-types/user-session/fields.ts";
import { UserSession } from "#extension/auth/entry-types/generated-types/user-session.ts";

const userSessionEntry = new EntryType<UserSession>("userSession", {
  label: "User Session",
  idMode: "ulid",
  fields: fields,
  actions: [],
});

export default userSessionEntry;
