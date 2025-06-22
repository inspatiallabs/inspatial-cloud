import { inTaskFields } from "/in-queue/entry-types/in-task/fields.ts";
import type { InTask } from "/in-queue/generated-types/in-task.ts";
import { runTask } from "/in-queue/entry-types/in-task/actions.ts";
import { validateTask } from "/in-queue/entry-types/in-task/hooks.ts";
import { EntryType } from "#orm/entry/entry-type.ts";

export const inTask = new EntryType<InTask>("inTask", {
  label: "InTask",
  description: "A task in the task queue",
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
