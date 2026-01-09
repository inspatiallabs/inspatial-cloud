import type { EntryName } from "#types/models.ts";
import type { DBFilter } from "@inspatial/cloud/types";
import { defineAPIAction } from "../api/cloud-action.ts";
import type { InCloud } from "../in-cloud.ts";

export async function getAuditLog(
  options: {
    inCloud: InCloud;
    entryType: EntryName;
    entryId?: string;
    accountId?: string;
  },
) {
  const { inCloud, accountId, entryId } = options;
  const entryType = options.entryType as EntryName;

  let logType: EntryName = accountId ? "accountLog" : "systemLog";
  const filter: DBFilter = [];
  if (entryType) {
    const entryDef = inCloud.orm.getEntryType(entryType);
    logType = entryDef.systemGlobal ? "systemLog" : "accountLog";

    filter.push({ field: "entryType", op: "=", value: entryType });
    if (entryId) {
      filter.push({ field: "entryId", op: "=", value: entryId });
    }
  }
  const orm = accountId
    ? inCloud.orm.withAccount(accountId)
    : inCloud.orm.withUser(inCloud.orm.systemGobalUser);
  const { rows } = await orm.getEntryList(logType, {
    filter,
    orderBy: "modifiedDate",
    order: "desc",
    columns: [
      "id",
      "user",
      "systemAdmin",
      "entryId",
      "entryTitle",
      "entryType",
      "modifiedDate",
      "action",
      "changes",
      "systemAdmin",
      "settingsType",
    ],
  });
  return rows;
}
export const getAuditLogAction = defineAPIAction("getAuditLog", {
  async action(
    { inCloud, params, orm },
  ) {
    return await getAuditLog({
      inCloud,
      entryType: params.entryType as EntryName,
      accountId: params.accountId || orm._accountId,
      entryId: params.entryId,
    });
  },
  params: [
    { key: "entryType", type: "ConnectionField", entryType: "entryMeta" },
    { key: "entryId", type: "DataField" },
    { key: "accountId", type: "ConnectionField", entryType: "account" },
  ],
});
