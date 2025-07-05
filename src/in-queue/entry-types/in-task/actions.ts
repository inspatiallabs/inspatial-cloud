import type { EntryActionDefinition } from "~/orm/entry/types.ts";
import type { InSpatialORM } from "~/orm/inspatial-orm.ts";

import { dateUtils } from "~/utils/date-utils.ts";
import type { InCloud } from "~/in-cloud.ts";
import type { InTask } from "./in-task.type.ts";
import type { InTaskGlobal } from "./in-task-global.type.ts";

export const runTask: EntryActionDefinition<any> = {
  key: "runTask",
  params: [],
  async action({
    entry,
    inCloud,
    orm,
  }) {
    const inTask = entry as InTask | InTaskGlobal;
    let results;
    switch (inTask.status) {
      case "queued":
      case "failed":
        break;
      default:
        return;
    }
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
        case "app":
          results = await runAppTask(inTask, inCloud);
          break;
      }
      inTask.resultData = results;
      inTask.status = "completed";
    } catch (e) {
      let data = {};

      inTask.status = "failed";
      if (e instanceof Error) {
        data = e;
      }
      inTask.resultData = data;
    }
    inTask.endTime = dateUtils.nowTimestamp();
    await inTask.save();
  },
};

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

async function runAppTask(inTask: InTask | InTaskGlobal, inCloud: InCloud) {
  return await inCloud.runAction(
    inTask.group!,
    inTask.actionName,
    inTask.taskData,
  );
}
