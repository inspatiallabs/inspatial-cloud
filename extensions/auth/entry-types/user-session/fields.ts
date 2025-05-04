import type { InField } from "#/orm/field/field-def-types.ts";

export default [{
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
}] as Array<InField>;
