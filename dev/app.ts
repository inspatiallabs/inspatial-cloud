import InSpatialCloud, {
  CloudAction,
  CloudActionGroup,
  CloudExtension,
} from "../packages/cloud/mod.ts";
import userAgentExtension from "#user-agent";
import { EntryType } from "#orm";
import type { TablePlan } from "./.inspatial/_generated/entries/table-plan.ts";
// import { EntryType } from "#orm";

const getUserAgentAction = new CloudAction("getUserAgent", {
  params: [],
  run({ inRequest }) {
    return inRequest.context.get("userAgent");
  },
});

const authActionGroup = new CloudActionGroup("Wedding", {
  description: "Wedding Planner Stuff",
  actions: [getUserAgentAction],
});

const tablePlanEntry = new EntryType<TablePlan>("tablePlan", {
  label: "Table Plan",
  idMode: "ulid",
  titleField: "tableName",
  defaultListFields: ["tableName"],
  fields: [{
    key: "tableName",
    description: "The name of the table",
    type: "DataField",
    label: "Table Name",
    required: true,
  }, {
    key: "capacity",
    type: "IntField",
    label: "Capacity",
    required: true,
  }],
  actions: [],
});

const extension = new CloudExtension({
  key: "my-extension",
  title: "My Extension",
  description: "This is my extension",
  version: "1.0.0",
  install(app) {},
  entryTypes: [tablePlanEntry],
  serverExtensions: [userAgentExtension],
  actionGroups: [authActionGroup],
});

const myApp = new InSpatialCloud("My App", {
  appExtensions: [extension],
});

await myApp.generateConfigFile();

await myApp.ready;
export default myApp;
