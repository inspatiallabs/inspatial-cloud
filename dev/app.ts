import InSpatialCloud, {
  CloudAction,
  CloudActionGroup,
  CloudExtension,
} from "../packages/cloud/mod.ts";
import userAgentExtension from "#user-agent";
import { EntryType } from "#orm";

const getUserAgentAction = new CloudAction("getUserAgent", {
  params: [],
  run({ inRequest }) {
    return inRequest.context.get("userAgent");
  },
});

const authActionGroup = new CloudActionGroup("auth", {
  description: "This is my amazing",
  actions: [getUserAgentAction],
});

const extension = new CloudExtension({
  key: "my-extension",
  title: "My Extension",
  description: "This is my extension",
  version: "1.0.0",
  install() {},
  entryTypes: [],
  serverExtensions: [userAgentExtension],
  actionGroups: [authActionGroup],
});

const myApp = new InSpatialCloud("My App", {
  appExtensions: [extension],
});

await myApp.generateConfigFile();

await myApp.ready;
export default myApp;
