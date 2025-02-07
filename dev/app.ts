import InSpatialApp, {
  AppAction,
  AppActionGroup,
  AppExtension,
} from "../packages/app/mod.ts";
import userAgentExtension from "#user-agent";

const getUserAgentAction = new AppAction("getUserAgent", {
  params: [],
  run({ inRequest }) {
    return inRequest.context.get("userAgent");
  },
});

const authActionGroup = new AppActionGroup("auth", {
  description: "This is my amazing",
  actions: [getUserAgentAction],
});

const extension = new AppExtension({
  key: "my-extension",
  title: "My Extension",
  description: "This is my extension",
  version: "1.0.0",
  install() {},
  serverExtensions: [userAgentExtension],
  actionGroups: [authActionGroup],
});

const myApp = new InSpatialApp("My App", {
  appExtensions: [extension],
});

// await myApp.generateConfigFile();

await myApp.ready;
export default myApp;
