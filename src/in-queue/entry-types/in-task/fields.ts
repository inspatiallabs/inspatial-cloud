import type { InField } from "#/orm/field/field-def-types.ts";

export const inTaskFields: Array<InField> = [{
  key: "taskType",
  label: "Task Type",
  type: "ChoicesField",
  required: true,
  choices: [{
    key: "entry",
    label: "Entry",
  }, {
    key: "settings",
    label: "Settings",
  }, {
    key: "app",
    label: "App",
  }],
}, {
  key: "typeKey",
  label: "Entry/Settings Name",
  type: "DataField",
  dependsOn: {
    field: "taskType",
    value: ["entry", "settings"],
  },
}, {
  key: "entryId",
  label: "Entry ID",
  description: "The ID of the entry to run the action on",
  type: "DataField",
  dependsOn: {
    field: "taskType",
    value: "entry",
  },
}, {
  key: "group",
  label: "Group",
  type: "DataField",
  dependsOn: {
    field: "taskType",
    value: "app",
  },
}, {
  key: "actionName",
  label: "Action Name",
  type: "DataField",
  required: true,
}, {
  key: "status",
  label: "Status",
  type: "ChoicesField",
  defaultValue: "queued",
  required: true,
  readOnly: true,
  choices: [{
    key: "queued",
    label: "Queued",
    color: "muted",
  }, {
    key: "running",
    label: "Running",
    color: "warning",
  }, {
    key: "cancelled",
    label: "Cancelled",
    color: "error",
  }, {
    key: "completed",
    label: "Completed",
    color: "success",
  }, {
    key: "failed",
    label: "Failed",
    color: "error",
  }],
}, {
  key: "startTime",
  label: "Start Time",
  type: "TimeStampField",
  readOnly: true,
  showTime: true,
}, {
  key: "endTime",
  label: "End Time",
  type: "TimeStampField",
  readOnly: true,
  showTime: true,
}, {
  key: "taskData",
  label: "Task Data",
  type: "JSONField",
  readOnly: true,
}, {
  key: "resultData",
  label: "Result Data",
  type: "JSONField",
  readOnly: true,
}];
