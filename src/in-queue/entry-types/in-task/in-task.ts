import { inTaskFields } from "~/in-queue/entry-types/in-task/fields.ts";

import { runTask } from "~/in-queue/entry-types/in-task/actions.ts";
import { validateTask } from "~/in-queue/entry-types/in-task/hooks.ts";
import { EntryType } from "~/orm/entry/entry-type.ts";
import type { InTask } from "./_in-task.type.ts";
import type { InTaskGlobal } from "./_in-task-global.type.ts";

export const inTask = new EntryType<InTask>("inTask", {
  label: "InTask",
  description: "A task in the task queue",
  systemGlobal: false,
  defaultListFields: [
    "status",
    "taskType",
    "typeKey",
    "entryId",
    "group",
    "actionName",
  ],
  fields: inTaskFields,
  actions: [runTask],
  hooks: {
    validate: [validateTask],
  },
});

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
  actions: [runTask],
  hooks: {
    validate: [validateTask],
  },
});
