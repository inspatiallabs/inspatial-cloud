import type { EntryHookDefinition } from "/orm/entry/types.ts";
import type { InTask } from "/in-queue/generated-types/in-task.ts";
import type { InCloud } from "/inspatial-cloud.ts";
import { raiseORMException } from "/orm/orm-exception.ts";
import type { InSpatialORM } from "/orm/inspatial-orm.ts";

export const validateTask: EntryHookDefinition<InTask> = {
  name: "validate entry or settings",
  description: "",
  handler({ inTask, orm, inCloud }) {
    switch (inTask.taskType) {
      case "entry":
        validateEntryTask(inTask, orm);
        break;
      case "settings":
        validateSettingsTask(inTask, orm);
        break;
      case "app":
        validateAppTask(inTask, inCloud);
    }
  },
};

async function validateEntryTask(inTask: InTask, orm: InSpatialORM) {
  const entryTypeName = inTask.typeKey;
  if (!entryTypeName) {
    raiseORMException(`EntryType must be set on this task!`);
  }
  const entryType = orm.getEntryType(entryTypeName);
  const actionName = inTask.actionName;

  if (!entryType.actions.has(actionName)) {
    raiseORMException(
      `Entry Type ${entryTypeName} doesn't have an action named ${actionName}!`,
    );
  }

  const entryId = inTask.entryId;
  if (!entryId) {
    raiseORMException("Entry ID must be set for this task!");
  }
  // Load the entry in order to trigget the not found exception if it doesn't exist
  await orm.getEntry(entryTypeName, entryId);
}

function validateSettingsTask(inTask: InTask, orm: InSpatialORM) {
  const settingsName = inTask.typeKey;
  if (!settingsName) {
    raiseORMException(`Settings Name must be set on this task!`);
  }
  const settings = orm.getSettingsType(settingsName);
  const actionName = inTask.actionName;

  if (!settings.actions.has(actionName)) {
    raiseORMException(
      `Settings Type ${settingsName} doesn't have an action named ${actionName}!`,
    );
  }
}

function validateAppTask(inTask: InTask, inCloud: InCloud) {
  const group = inTask.group;
  const actionName = inTask.actionName;
  if (!group) {
    raiseORMException("You must set the action group for this task!");
  }
  if (!inCloud.actionGroups.has(group)) {
    raiseORMException(`group ${group} doesn't exist!`);
  }

  const actionGroup = inCloud.actionGroups.get(group)!;
  if (!actionGroup.actions.has(actionName)) {
    raiseORMException(`action ${actionName} doesn't exist in group ${group}!`);
  }
}
