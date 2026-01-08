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
  const orm = accountId
    ? inCloud.orm.withAccount(accountId)
    : inCloud.orm.withUser(inCloud.orm.systemGobalUser);
  const entryDef = orm.getEntryType(entryType);
  const logType: EntryName = entryDef.systemGlobal ? "systemLog" : "accountLog";
  const filter: DBFilter = [{ field: "entryType", op: "=", value: entryType }];
  if (entryId) {
    filter.push({ field: "entryId", op: "=", value: entryId });
  }
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
    { inCloud, inRequest, inResponse, orm, params },
  ) {
    return await getAuditLog({
      inCloud,
      entryType: params.entryType as EntryName,
      accountId: orm._accountId,
      entryId: params.entryId,
    });
  },
  params: [
    {
      key: "entryType",
      type: "ConnectionField",
      entryType: "entryMeta",
      required: true,
    },
    { key: "entryId", type: "DataField" },
  ],
});
