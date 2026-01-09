import type { EntryHookDefinition } from "~/orm/entry/types.ts";

import { raiseORMException } from "~/orm/orm-exception.ts";
import type { InSpatialORM } from "~/orm/inspatial-orm.ts";
import type { InCloud } from "~/in-cloud.ts";

export const validateTask: EntryHookDefinition = {
  name: "validate entry or settings",
  handler({ entry: inTask, orm, inCloud }) {
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

async function validateEntryTask(
  inTask: InTaskGlobal,
  orm: InSpatialORM,
) {
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
  const id = await orm.db.getValue(entryType.config.tableName, entryId, "id");
  if (!id) {
    raiseORMException(
      `Entry with ID ${entryId} doesn't exist in Entry Type ${entryTypeName}!`,
    );
  }
}

function validateSettingsTask(
  inTask: InTask | InTaskGlobal,
  orm: InSpatialORM,
) {
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

function validateAppTask(inTask: InTask | InTaskGlobal, inCloud: InCloud) {
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
