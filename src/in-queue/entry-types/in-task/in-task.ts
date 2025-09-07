import { inTaskFields } from "~/in-queue/entry-types/in-task/fields.ts";

import { EntryType } from "~/orm/entry/entry-type.ts";

import dateUtils from "../../../utils/date-utils.ts";
import type { InSpatialORM } from "../../../orm/inspatial-orm.ts";
import { convertString } from "~/utils/mod.ts";
import type { EntryName, SettingsName } from "#types/models.ts";

const config = {
  titleField: "title",
  defaultListFields: [
    "status",
    "taskType",
    "typeKey",
    "entryId",
    "group",
    "actionName",
  ],
  fields: inTaskFields,
  hooks: {
    beforeCreate: [{
      name: "setTitle",
      handler({ entry }: { entry: any }) {
        let title = `${convertString(entry.taskType, "title")}: `;
        if (entry.typeKey) {
          title += `${convertString(entry.typeKey, "title")}`;
        }
        title += ` - ${entry.actionName}`;
        entry.title = title;
      },
    }],
  },
  actions: [{
    key: "runTask",
    params: [],
    async action({ entry, inCloud, orm }: {
      entry: any;
      inCloud: any;
      orm: InSpatialORM;
    }) {
      let results;
      switch (entry.status) {
        case "queued":
        case "failed":
          break;
        default:
          return;
      }
      // const orm = inCloud.orm.withAccount(
      //   inCloud.orm.systemGobalUser.accountId,
      // );
      entry.status = "running";
      entry.startTime = dateUtils.nowTimestamp();
      await entry.save();
      try {
        switch (entry.taskType) {
          case "entry":
            results = await runEntryTask({
              actionName: entry.actionName,
              entryType: entry.typeKey!,
              id: entry.entryId!,
              taskData: entry.taskData,
              orm,
            });
            break;
          case "settings":
            results = await runSettingsTask({
              actionName: entry.actionName,
              settings: entry.typeKey!,
              taskData: entry.taskData,
              orm,
            });
            break;
            // case "app":
            //   results = await runAppTask(inTask, inCloud);
            //   break;
        }

        entry.resultData = {
          result: results,
        };
        entry.status = "completed";
      } catch (e) {
        entry.errorInfo = Deno.inspect(e);
        inCloud.inLog.error(e, {
          subject: `${entry.typeKey} ${entry.entryId} - ${entry.actionName}`,
          stackTrace: e instanceof Error ? e.stack : undefined,
        });
        entry.status = "failed";
      }
      entry.endTime = dateUtils.nowTimestamp();
      await entry.save();
    },
  }],
} as any;
export const inTaskGlobal = new EntryType("inTaskGlobal", {
  ...config,
  label: "InTask Global",
  description: "A task in the global task queue",
  systemGlobal: true,
});
export const inTask = new EntryType("inTask", {
  ...config,
  label: "InTask",
  description: "A task in the account task queue",
});

async function runEntryTask(args: {
  entryType: string;
  id: string;
  actionName: string;
  taskData?: Record<string, any>;
  orm: InSpatialORM;
}) {
  const { entryType, id, actionName, taskData, orm } = args;
  const entry = await orm.getEntry(entryType as EntryName, id);
  return await entry.runAction(actionName, taskData);
}
async function runSettingsTask(
  args: {
    settings: string;
    actionName: string;
    taskData?: Record<string, any>;
    orm: InSpatialORM;
  },
) {
  const { settings: settingsKey, actionName, taskData, orm } = args;
  const settings = await orm.getSettings(settingsKey as SettingsName);
  return await settings.runAction(actionName, taskData);
}
