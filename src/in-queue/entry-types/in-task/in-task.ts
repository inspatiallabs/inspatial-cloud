import { inTaskFields } from "~/in-queue/entry-types/in-task/fields.ts";

import { runTask } from "~/in-queue/entry-types/in-task/actions.ts";
import { validateTask } from "~/in-queue/entry-types/in-task/hooks.ts";
import { EntryType } from "~/orm/entry/entry-type.ts";
import type { InTask } from "./_in-task.type.ts";
import type { InTaskGlobal } from "./_in-task-global.type.ts";
import { raiseORMException } from "../../../orm/orm-exception.ts";
import dateUtils from "../../../utils/date-utils.ts";
import { InSpatialORM } from "../../../orm/inspatial-orm.ts";

// export const inTask = new EntryType<InTask>("inTask", {
//   label: "InTask",
//   description: "A task in the task queue",
//   systemGlobal: false,
//   defaultListFields: [
//     "status",
//     "taskType",
//     "typeKey",
//     "entryId",
//     "group",
//     "actionName",
//   ],
//   fields: inTaskFields,
//   actions: [runTask],
//   hooks: {
//     validate: [validateTask],
//   },
// });

export const inTaskGlobal = new EntryType<InTaskGlobal>("inTaskGlobal", {
  label: "InTask Global",
  description: "A task in the global task queue",
  systemGlobal: true,
  defaultListFields: [
    "status",
    "taskType",
    "typeKey",
    "entryId",
    "group",
    "actionName",
  ],
  fields: inTaskFields,
});

inTaskGlobal.addAction({
  key: "runTask",
  params: [],
  async action({
    inTaskGlobal,
    inCloud,
  }) {
    const inTask = inTaskGlobal;
    let results;
    switch (inTask.status) {
      case "queued":
      case "failed":
        break;
      default:
        return;
    }
    const orm = inCloud.orm.withAccount(inCloud.orm.systemGobalUser.accountId);
    inTask.status = "running";
    inTask.startTime = dateUtils.nowTimestamp();
    await inTask.save();
    try {
      switch (inTask.taskType) {
        case "entry":
          results = await runEntryTask(inTask, orm);
          break;
        case "settings":
          results = await runSettingsTask(inTask, orm);
          break;
          // case "app":
          //   results = await runAppTask(inTask, inCloud);
          //   break;
      }

      inTask.resultData = {
        result: results,
      };
      inTask.status = "completed";
    } catch (e) {
      inTask.errorInfo = Deno.inspect(e);
      inTask.status = "failed";
    }
    inTask.endTime = dateUtils.nowTimestamp();
    await inTask.save();
  },
});
async function runEntryTask(inTask: InTask | InTaskGlobal, orm: InSpatialORM) {
  const entry = await orm.getEntry(inTask.typeKey!, inTask.entryId!);
  return await entry.runAction(inTask.actionName, inTask.taskData);
}
async function runSettingsTask(
  inTask: InTask | InTaskGlobal,
  orm: InSpatialORM,
) {
  const settings = await orm.getSettings(inTask.typeKey!);
  return await settings.runAction(inTask.actionName, inTask.taskData);
}
