import InSpatialApp, {
  AppAction,
  AppActionGroup,
  AppExtension,
} from "../packages/app/mod.ts";
import userAgentExtension from "#user-agent";
import { EntryType } from "#orm";

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
const userEntry = new EntryType("user", {
  fields: [{
    type: "DataField",
    key: "firstName",
    label: "First Name",
    description: "The user's first name",
    required: true,
  }, {
    type: "DataField",
    key: "lastName",
    label: "Last Name",
    description: "The user's last name",
    required: true,
  }, {
    type: "EmailField",
    key: "email",
    label: "Email",
    description: "The user's email address used for login",
    required: true,
  }, {
    type: "PasswordField",
    key: "password",
    label: "Password",
    description: "The user's password used for login",
  }],
});
const extension = new AppExtension({
  key: "my-extension",
  title: "My Extension",
  description: "This is my extension",
  version: "1.0.0",
  install() {},
  entryTypes: [userEntry],
  serverExtensions: [userAgentExtension],
  actionGroups: [authActionGroup],
});

const myApp = new InSpatialApp("My App", {
  appExtensions: [extension],
});

await myApp.generateConfigFile();

await myApp.ready;
export default myApp;
